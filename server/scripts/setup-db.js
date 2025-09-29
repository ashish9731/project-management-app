const { sequelize } = require('./models');
const { Project, Task, Timesheet } = require('./models/associations');

const setupDatabase = async () => {
  try {
    console.log('Setting up database...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Sync all models
    await sequelize.sync({ force: false });
    console.log('Database models synchronized.');
    
    console.log('Database setup completed successfully!');
    
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
