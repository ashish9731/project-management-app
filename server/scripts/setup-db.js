const { sequelize } = require('./models');
const { User, Project, Task, Timesheet } = require('./models/associations');

const setupDatabase = async () => {
  try {
    console.log('Setting up database...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models
    await sequelize.sync({ force: false });
    console.log('Database models synchronized.');
    
    // Create default admin user if it doesn't exist
    const adminExists = await User.findOne({ where: { email: 'admin@example.com' } });
    if (!adminExists) {
      await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
        isActive: true
      });
      console.log('Default admin user created (email: admin@example.com, password: admin123)');
    }
    
    // Create sample manager user if it doesn't exist
    const managerExists = await User.findOne({ where: { email: 'manager@example.com' } });
    if (!managerExists) {
      await User.create({
        firstName: 'Manager',
        lastName: 'User',
        email: 'manager@example.com',
        password: 'manager123',
        role: 'manager',
        isActive: true,
        department: 'Management',
        position: 'Project Manager'
      });
      console.log('Sample manager user created (email: manager@example.com, password: manager123)');
    }
    
    // Create sample employee user if it doesn't exist
    const employeeExists = await User.findOne({ where: { email: 'employee@example.com' } });
    if (!employeeExists) {
      await User.create({
        firstName: 'Employee',
        lastName: 'User',
        email: 'employee@example.com',
        password: 'employee123',
        role: 'employee',
        isActive: true,
        department: 'Development',
        position: 'Software Developer'
      });
      console.log('Sample employee user created (email: employee@example.com, password: employee123)');
    }
    
    console.log('Database setup completed successfully!');
    console.log('\nDefault users created:');
    console.log('- Admin: admin@example.com / admin123');
    console.log('- Manager: manager@example.com / manager123');
    console.log('- Employee: employee@example.com / employee123');
    
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase().then(() => {
    process.exit(0);
  });
}

module.exports = setupDatabase;
