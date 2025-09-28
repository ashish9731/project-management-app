const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Task, Project, User, Timesheet } = require('../models/associations');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/tasks
// @desc    Get all tasks
// @access  Private
router.get('/', [
  authMiddleware,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['todo', 'in-progress', 'review', 'done']).withMessage('Invalid status'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  query('projectId').optional().isUUID().withMessage('Invalid project ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (req.query.status) whereClause.status = req.query.status;
    if (req.query.priority) whereClause.priority = req.query.priority;
    if (req.query.projectId) whereClause.projectId = req.query.projectId;
    if (req.query.search) {
      whereClause.title = {
        [require('sequelize').Op.iLike]: `%${req.query.search}%`
      };
    }

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause.assignedTo = req.user.id;
    }

    const { count, rows: tasks } = await Task.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status', 'color']
        },
        {
          model: Timesheet,
          as: 'timesheets',
          attributes: ['id', 'hours', 'date'],
          required: false
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Calculate time statistics
    const tasksWithStats = tasks.map(task => {
      const timesheets = task.timesheets || [];
      const totalLoggedHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.hours), 0);
      const estimatedHours = parseFloat(task.estimatedHours) || 0;
      const progressPercentage = estimatedHours > 0 ? Math.round((totalLoggedHours / estimatedHours) * 100) : 0;

      return {
        ...task.toJSON(),
        timeStats: {
          estimated: estimatedHours,
          logged: totalLoggedHours,
          progressPercentage: Math.min(progressPercentage, 100)
        }
      };
    });

    res.json({
      success: true,
      data: {
        tasks: tasksWithStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tasks'
    });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status', 'color']
        },
        {
          model: Timesheet,
          as: 'timesheets',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ],
          order: [['date', 'DESC']]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'employee' && task.assignedTo !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { task }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching task'
    });
  }
});

// @route   POST /api/tasks
// @desc    Create new task
// @access  Private (Manager/Admin)
router.post('/', [
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Task title must be between 3 and 200 characters'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('projectId').isUUID().withMessage('Project ID is required'),
  body('assignedTo').optional().isUUID().withMessage('Invalid assignee ID'),
  body('estimatedHours').optional().isDecimal().withMessage('Invalid estimated hours'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      status = 'todo',
      priority = 'medium',
      projectId,
      assignedTo,
      estimatedHours,
      dueDate,
      tags = []
    } = req.body;

    // Validate project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(400).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Validate assignee if provided
    if (assignedTo) {
      const assignee = await User.findByPk(assignedTo);
      if (!assignee || !assignee.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assignee'
        });
      }
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      projectId,
      assignedTo: assignedTo || null,
      estimatedHours,
      dueDate,
      tags,
      createdBy: req.user.id
    });

    // Fetch the created task with associations
    const createdTask = await Task.findByPk(task.id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status', 'color']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task: createdTask }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating task'
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put('/:id', [
  authMiddleware,
  body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Task title must be between 3 and 200 characters'),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('assignedTo').optional().isUUID().withMessage('Invalid assignee ID'),
  body('estimatedHours').optional().isDecimal().withMessage('Invalid estimated hours'),
  body('actualHours').optional().isDecimal().withMessage('Invalid actual hours'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const canUpdate = req.user.role === 'admin' || 
                     req.user.role === 'manager' || 
                     task.assignedTo === req.user.id ||
                     task.createdBy === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updateData = {};
    const allowedFields = ['title', 'description', 'priority', 'estimatedHours', 'dueDate', 'tags'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle status update
    if (req.body.status !== undefined) {
      updateData.status = req.body.status;
      if (req.body.status === 'done' && task.status !== 'done') {
        updateData.completedAt = new Date();
      } else if (req.body.status !== 'done' && task.status === 'done') {
        updateData.completedAt = null;
      }
    }

    // Handle assignee update (only managers/admins can reassign)
    if (req.body.assignedTo !== undefined && ['admin', 'manager'].includes(req.user.role)) {
      if (req.body.assignedTo) {
        const assignee = await User.findByPk(req.body.assignedTo);
        if (!assignee || !assignee.isActive) {
          return res.status(400).json({
            success: false,
            message: 'Invalid assignee'
          });
        }
      }
      updateData.assignedTo = req.body.assignedTo;
    }

    // Handle actual hours (only assigned user can update)
    if (req.body.actualHours !== undefined && task.assignedTo === req.user.id) {
      updateData.actualHours = req.body.actualHours;
    }

    await task.update(updateData);

    // Fetch updated task with associations
    const updatedTask = await Task.findByPk(task.id, {
      include: [
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status', 'color']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task: updatedTask }
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating task'
    });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private (Manager/Admin)
router.delete('/:id', [
  authMiddleware,
  roleMiddleware('admin', 'manager')
], async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await task.destroy();

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting task'
    });
  }
});

module.exports = router;
