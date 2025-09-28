const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Project, User, Task } = require('../models/associations');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/projects
// @desc    Get all projects
// @access  Private
router.get('/', [
  authMiddleware,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']).withMessage('Invalid status'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
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
    if (req.query.search) {
      whereClause.name = {
        [require('sequelize').Op.iLike]: `%${req.query.search}%`
      };
    }

    // Role-based filtering
    if (req.user.role === 'employee') {
      // Employees can only see projects they're assigned to or created
      whereClause[require('sequelize').Op.or] = [
        { managerId: req.user.id },
        { createdBy: req.user.id }
      ];
    }

    const { count, rows: projects } = await Project.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Task,
          as: 'tasks',
          attributes: ['id', 'status'],
          required: false
        }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Calculate task statistics
    const projectsWithStats = projects.map(project => {
      const tasks = project.tasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.status === 'done').length;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...project.toJSON(),
        taskStats: {
          total: totalTasks,
          completed: completedTasks,
          completionPercentage
        }
      };
    });

    res.json({
      success: true,
      data: {
        projects: projectsWithStats,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching projects'
    });
  }
});

// @route   GET /api/projects/:id
// @desc    Get single project
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Task,
          as: 'tasks',
          include: [
            {
              model: User,
              as: 'assignee',
              attributes: ['id', 'firstName', 'lastName', 'email']
            }
          ]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'employee' && 
        project.managerId !== req.user.id && 
        project.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { project }
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching project'
    });
  }
});

// @route   POST /api/projects
// @desc    Create new project
// @access  Private (Manager/Admin)
router.post('/', [
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Project name must be between 3 and 100 characters'),
  body('description').optional().trim(),
  body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date'),
  body('budget').optional().isDecimal().withMessage('Invalid budget'),
  body('managerId').optional().isUUID().withMessage('Invalid manager ID'),
  body('color').optional().isHexColor().withMessage('Invalid color')
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
      name,
      description,
      status = 'planning',
      priority = 'medium',
      startDate,
      endDate,
      budget,
      managerId,
      color = '#3B82F6'
    } = req.body;

    // Validate manager if provided
    if (managerId) {
      const manager = await User.findByPk(managerId);
      if (!manager || !['admin', 'manager'].includes(manager.role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid manager. Manager must be an admin or manager.'
        });
      }
    }

    const project = await Project.create({
      name,
      description,
      status,
      priority,
      startDate,
      endDate,
      budget,
      managerId: managerId || req.user.id,
      createdBy: req.user.id,
      color
    });

    // Fetch the created project with associations
    const createdProject = await Project.findByPk(project.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: { project: createdProject }
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating project'
    });
  }
});

// @route   PUT /api/projects/:id
// @desc    Update project
// @access  Private (Manager/Admin)
router.put('/:id', [
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  body('name').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Project name must be between 3 and 100 characters'),
  body('description').optional().trim(),
  body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']).withMessage('Invalid status'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('startDate').optional().isISO8601().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date'),
  body('budget').optional().isDecimal().withMessage('Invalid budget'),
  body('managerId').optional().isUUID().withMessage('Invalid manager ID'),
  body('color').optional().isHexColor().withMessage('Invalid color')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user can update this project
    if (req.user.role === 'manager' && 
        project.managerId !== req.user.id && 
        project.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updateData = {};
    const allowedFields = ['name', 'description', 'status', 'priority', 'startDate', 'endDate', 'budget', 'color'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle manager assignment
    if (req.body.managerId !== undefined) {
      if (req.body.managerId) {
        const manager = await User.findByPk(req.body.managerId);
        if (!manager || !['admin', 'manager'].includes(manager.role)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid manager. Manager must be an admin or manager.'
          });
        }
      }
      updateData.managerId = req.body.managerId;
    }

    await project.update(updateData);

    // Fetch updated project with associations
    const updatedProject = await Project.findByPk(project.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'manager',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: { project: updatedProject }
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating project'
    });
  }
});

// @route   DELETE /api/projects/:id
// @desc    Delete project
// @access  Private (Admin)
router.delete('/:id', [
  authMiddleware,
  roleMiddleware('admin')
], async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    await project.destroy();

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting project'
    });
  }
});

module.exports = router;
