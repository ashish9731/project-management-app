const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Timesheet, Task, Project, User } = require('../models/associations');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/timesheets
// @desc    Get all timesheets
// @access  Private
router.get('/', [
  authMiddleware,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['draft', 'submitted', 'approved', 'rejected']).withMessage('Invalid status'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('projectId').optional().isUUID().withMessage('Invalid project ID'),
  query('taskId').optional().isUUID().withMessage('Invalid task ID'),
  query('userId').optional().isUUID().withMessage('Invalid user ID')
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
    if (req.query.projectId) whereClause.projectId = req.query.projectId;
    if (req.query.taskId) whereClause.taskId = req.query.taskId;
    if (req.query.userId) whereClause.userId = req.query.userId;

    // Date filtering
    if (req.query.startDate || req.query.endDate) {
      whereClause.date = {};
      if (req.query.startDate) {
        whereClause.date[require('sequelize').Op.gte] = req.query.startDate;
      }
      if (req.query.endDate) {
        whereClause.date[require('sequelize').Op.lte] = req.query.endDate;
      }
    }

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause.userId = req.user.id;
    }

    const { count, rows: timesheets } = await Timesheet.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'status', 'color']
        }
      ],
      limit,
      offset,
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        timesheets,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get timesheets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching timesheets'
    });
  }
});

// @route   GET /api/timesheets/summary
// @desc    Get timesheet summary
// @access  Private
router.get('/summary', [
  authMiddleware,
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('userId').optional().isUUID().withMessage('Invalid user ID'),
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

    const whereClause = {};
    if (req.query.userId) whereClause.userId = req.query.userId;
    if (req.query.projectId) whereClause.projectId = req.query.projectId;

    // Date filtering
    if (req.query.startDate || req.query.endDate) {
      whereClause.date = {};
      if (req.query.startDate) {
        whereClause.date[require('sequelize').Op.gte] = req.query.startDate;
      }
      if (req.query.endDate) {
        whereClause.date[require('sequelize').Op.lte] = req.query.endDate;
      }
    }

    // Role-based filtering
    if (req.user.role === 'employee') {
      whereClause.userId = req.user.id;
    }

    const timesheets = await Timesheet.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'color']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title']
        }
      ],
      order: [['date', 'DESC']]
    });

    // Calculate summary statistics
    const totalHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.hours), 0);
    const billableHours = timesheets.filter(ts => ts.isBillable).reduce((sum, ts) => sum + parseFloat(ts.hours), 0);
    const nonBillableHours = totalHours - billableHours;

    // Group by project
    const projectSummary = timesheets.reduce((acc, ts) => {
      const projectId = ts.projectId;
      if (!acc[projectId]) {
        acc[projectId] = {
          project: ts.project,
          totalHours: 0,
          billableHours: 0,
          entries: 0
        };
      }
      acc[projectId].totalHours += parseFloat(ts.hours);
      if (ts.isBillable) acc[projectId].billableHours += parseFloat(ts.hours);
      acc[projectId].entries += 1;
      return acc;
    }, {});

    // Group by user
    const userSummary = timesheets.reduce((acc, ts) => {
      const userId = ts.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: ts.user,
          totalHours: 0,
          billableHours: 0,
          entries: 0
        };
      }
      acc[userId].totalHours += parseFloat(ts.hours);
      if (ts.isBillable) acc[userId].billableHours += parseFloat(ts.hours);
      acc[userId].entries += 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        summary: {
          totalHours,
          billableHours,
          nonBillableHours,
          totalEntries: timesheets.length
        },
        projectSummary: Object.values(projectSummary),
        userSummary: Object.values(userSummary),
        timesheets
      }
    });
  } catch (error) {
    console.error('Get timesheet summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching timesheet summary'
    });
  }
});

// @route   POST /api/timesheets
// @desc    Create new timesheet entry
// @access  Private
router.post('/', [
  authMiddleware,
  body('date').isISO8601().withMessage('Date is required and must be valid'),
  body('hours').isDecimal({ min: 0.01, max: 24 }).withMessage('Hours must be between 0.01 and 24'),
  body('description').optional().trim(),
  body('taskId').isUUID().withMessage('Task ID is required'),
  body('projectId').isUUID().withMessage('Project ID is required'),
  body('isBillable').optional().isBoolean().withMessage('isBillable must be boolean')
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
      date,
      hours,
      description,
      taskId,
      projectId,
      isBillable = true
    } = req.body;

    // Validate task exists and user has access
    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!task) {
      return res.status(400).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user can log time for this task
    const canLogTime = req.user.role === 'admin' || 
                      req.user.role === 'manager' || 
                      task.assignedTo === req.user.id;

    if (!canLogTime) {
      return res.status(403).json({
        success: false,
        message: 'You can only log time for tasks assigned to you'
      });
    }

    // Validate project matches task's project
    if (task.projectId !== projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project does not match task project'
      });
    }

    // Check for duplicate entry on same date
    const existingEntry = await Timesheet.findOne({
      where: {
        userId: req.user.id,
        taskId,
        date
      }
    });

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: 'Time entry already exists for this task on this date'
      });
    }

    const timesheet = await Timesheet.create({
      date,
      hours,
      description,
      taskId,
      projectId,
      userId: req.user.id,
      isBillable,
      status: 'draft'
    });

    // Fetch the created timesheet with associations
    const createdTimesheet = await Timesheet.findByPk(timesheet.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
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
      message: 'Timesheet entry created successfully',
      data: { timesheet: createdTimesheet }
    });
  } catch (error) {
    console.error('Create timesheet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating timesheet entry'
    });
  }
});

// @route   PUT /api/timesheets/:id
// @desc    Update timesheet entry
// @access  Private
router.put('/:id', [
  authMiddleware,
  body('hours').optional().isDecimal({ min: 0.01, max: 24 }).withMessage('Hours must be between 0.01 and 24'),
  body('description').optional().trim(),
  body('isBillable').optional().isBoolean().withMessage('isBillable must be boolean'),
  body('status').optional().isIn(['draft', 'submitted', 'approved', 'rejected']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const timesheet = await Timesheet.findByPk(req.params.id);
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: 'Timesheet entry not found'
      });
    }

    // Check permissions
    const canUpdate = req.user.role === 'admin' || 
                     req.user.role === 'manager' || 
                     timesheet.userId === req.user.id;

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if timesheet can be updated based on status
    if (timesheet.status === 'approved' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update approved timesheet entry'
      });
    }

    const updateData = {};
    const allowedFields = ['hours', 'description', 'isBillable'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Handle status update (only managers/admins can approve/reject)
    if (req.body.status !== undefined) {
      if (['approved', 'rejected'].includes(req.body.status) && !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Only managers and admins can approve or reject timesheets'
        });
      }

      updateData.status = req.body.status;
      
      if (req.body.status === 'approved') {
        updateData.approvedBy = req.user.id;
        updateData.approvedAt = new Date();
        updateData.rejectionReason = null;
      } else if (req.body.status === 'rejected') {
        updateData.approvedBy = null;
        updateData.approvedAt = null;
        updateData.rejectionReason = req.body.rejectionReason || 'No reason provided';
      }
    }

    await timesheet.update(updateData);

    // Fetch updated timesheet with associations
    const updatedTimesheet = await Timesheet.findByPk(timesheet.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
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
      message: 'Timesheet entry updated successfully',
      data: { timesheet: updatedTimesheet }
    });
  } catch (error) {
    console.error('Update timesheet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating timesheet entry'
    });
  }
});

// @route   DELETE /api/timesheets/:id
// @desc    Delete timesheet entry
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const timesheet = await Timesheet.findByPk(req.params.id);
    if (!timesheet) {
      return res.status(404).json({
        success: false,
        message: 'Timesheet entry not found'
      });
    }

    // Check permissions
    const canDelete = req.user.role === 'admin' || 
                     req.user.role === 'manager' || 
                     (timesheet.userId === req.user.id && timesheet.status === 'draft');

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await timesheet.destroy();

    res.json({
      success: true,
      message: 'Timesheet entry deleted successfully'
    });
  } catch (error) {
    console.error('Delete timesheet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting timesheet entry'
    });
  }
});

module.exports = router;
