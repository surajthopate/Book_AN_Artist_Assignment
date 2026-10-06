const { getMySQLPool, getMongoDb } = require('../config/database');

async function pingDatabases() {
  const status = {
    configured: false,
    mysql: false,
    mongodb: false,
  };

  try {
    const mysqlPool = await getMySQLPool();
    const mongoDb = await getMongoDb();

    if (!mysqlPool || !mongoDb) {
      return status;
    }

    status.configured = true;

    const [[mysqlResult]] = await mysqlPool.query('SELECT 1 AS ok');
    const mongoPing = await mongoDb.command({ ping: 1 });

    status.mysql = mysqlResult?.ok === 1;
    status.mongodb = mongoPing?.ok === 1;
    return status;
  } catch (error) {
    return {
      ...status,
      error: error.message || 'Database ping failed.',
    };
  }
}

module.exports = {
  pingDatabases,
};
