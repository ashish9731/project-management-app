const User = require('./User');
const Project = require('./Project');
const Task = require('./Task');
const Timesheet = require('./Timesheet');

// User associations
User.hasMany(Project, { foreignKey: 'createdBy', as: 'createdProjects' });
User.hasMany(Project, { foreignKey: 'managerId', as: 'managedProjects' });
User.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });
User.hasMany(Task, { foreignKey: 'createdBy', as: 'createdTasks' });
User.hasMany(Timesheet, { foreignKey: 'userId', as: 'timesheets' });
User.hasMany(Timesheet, { foreignKey: 'approvedBy', as: 'approvedTimesheets' });

// Project associations
Project.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Project.belongsTo(User, { foreignKey: 'managerId', as: 'manager' });
Project.hasMany(Task, { foreignKey: 'projectId', as: 'tasks' });
Project.hasMany(Timesheet, { foreignKey: 'projectId', as: 'timesheets' });

// Task associations
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });
Task.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Task.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });
Task.hasMany(Timesheet, { foreignKey: 'taskId', as: 'timesheets' });

// Timesheet associations
Timesheet.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Timesheet.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
Timesheet.belongsTo(Task, { foreignKey: 'taskId', as: 'task' });
Timesheet.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

module.exports = {
  User,
  Project,
  Task,
  Timesheet
};
