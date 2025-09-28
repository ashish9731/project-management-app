const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Timesheet = sequelize.define('Timesheet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  hours: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 24
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isBillable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'submitted', 'approved', 'rejected'),
    defaultValue: 'draft',
    allowNull: false
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  indexes: [
    {
      fields: ['date']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['taskId']
    },
    {
      fields: ['status']
    },
    {
      unique: true,
      fields: ['userId', 'taskId', 'date']
    }
  ]
});

module.exports = Timesheet;
