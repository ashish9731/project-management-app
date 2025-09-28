const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { User, Project, Task, Timesheet } = require('../models/associations');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Manager/Admin)
router.get('/', [
  authMiddleware,
  roleMiddleware('admin', 'manager'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('role').optional().isIn(['admin', 'manager', 'employee']).withMessage('Invalid role'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean')
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
    if (req.query.role) whereClause.role = req.query.role;
    if (req.query.isActive !== undefined) whereClause.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      whereClause[require('sequelize').Op.or] = [
        { firstName: { [require('sequelize').Op.iLike]: `%${req.query.search}%` } },
        { lastName: { [require('sequelize').Op.iLike]: `%${req.query.search}%` } },
        { email: { [require('sequelize').Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'avatar', 'phone', 'department', 'position', 'createdAt'],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'isActive', 'avatar', 'phone', 'department', 'position', 'createdAt'],
      include: [
        {
          model: Project,
          as: 'managedProjects',
          attributes: ['id', 'name', 'status', 'priority'],
          limit: 5
        },
        {
          model: Task,
          as: 'assignedTasks',
          attributes: ['id', 'title', 'status', 'priority'],
          limit: 5
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'employee' && req.user.id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/:id', [
  authMiddleware,
  roleMiddleware('admin'),
  body('firstName').optional().trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').optional().trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('role').optional().isIn(['admin', 'manager', 'employee']).withMessage('Invalid role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('phone').optional().trim(),
  body('department').optional().trim(),
  body('position').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = {};
    const allowedFields = ['firstName', 'lastName', 'email', 'role', 'isActive', 'phone', 'department', 'position'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Check for email uniqueness if email is being updated
    if (req.body.email && req.body.email !== user.email) {
      const existingUser = await User.findOne({ where: { email: req.body.email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    await user.update(updateData);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          avatar: user.avatar,
          phone: user.phone,
          department: user.department,
          position: user.position
        }
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/:id', [
  authMiddleware,
  roleMiddleware('admin')
], async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deletion
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
});

// @route   GET /api/users/:id/timesheets
// @desc    Get user timesheets
// @access  Private
router.get('/:id/timesheets', [
  authMiddleware,
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Check access permissions
    if (req.user.role === 'employee' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const whereClause = { userId };

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

    const { count, rows: timesheets } = await Timesheet.findAndCountAll({
      where: whereClause,
      include: [
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
      order: [['date', 'DESC']]
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
    console.error('Get user timesheets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user timesheets'
    });
  }
});

// @route   GET /api/users/:id/stats
// @desc    Get user statistics
// @access  Private
router.get('/:id/stats', [
  authMiddleware,
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.params.id;

    // Check access permissions
    if (req.user.role === 'employee' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const whereClause = { userId };

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

    const timesheets = await Timesheet.findAll({
      where: whereClause,
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name']
        },
        {
          model: Task,
          as: 'task',
          attributes: ['id', 'title', 'status']
        }
      ]
    });

    const totalHours = timesheets.reduce((sum, ts) => sum + parseFloat(ts.hours), 0);
    const billableHours = timesheets.filter(ts => ts.isBillable).reduce((sum, ts) => sum + parseFloat(ts.hours), 0);

    // Group by project
    const projectStats = timesheets.reduce((acc, ts) => {
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

    // Group by status
    const statusStats = timesheets.reduce((acc, ts) => {
      const status = ts.status;
      if (!acc[status]) {
        acc[status] = { count: 0, hours: 0 };
      }
      acc[status].count += 1;
      acc[status].hours += parseFloat(ts.hours);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        summary: {
          totalHours,
          billableHours,
          nonBillableHours: totalHours - billableHours,
          totalEntries: timesheets.length
        },
        projectStats: Object.values(projectStats),
        statusStats
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics'
    });
  }
});

module.exports = router;
