const app = require('./app');
const env = require('./config/env');
const { checkDatabaseConnections } = require('./config/database');

const port = env.PORT;

async function startServer() {
  try {
    const dbStatus = await checkDatabaseConnections();

    if (!dbStatus.configured || !dbStatus.mysql || !dbStatus.mongodb) {
      const errors = [];

      if (!dbStatus.configured) {
        errors.push('Database environment is not configured.');
      }

      if (!dbStatus.mysql) {
        errors.push(dbStatus.mysqlError || 'MySQL connection failed');
      }

      if (!dbStatus.mongodb) {
        errors.push(dbStatus.mongodbError || 'MongoDB connection failed');
      }

      throw new Error(errors.join('; '));
    }

    console.log('Database connections OK: MySQL and MongoDB');

    const server = app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Stop the running process or set a different PORT in your environment.`);
        process.exit(1);
      }

      console.error(`Unexpected server error: ${error.message}`);
      process.exit(1);
    });
  } catch (error) {
    console.error('Startup failed. Local MySQL and MongoDB must be running before npm start.');
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
