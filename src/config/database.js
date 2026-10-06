const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');
const env = require('./env');

const mysqlConfig = {
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
};

const mongoConfig = {
  uri: process.env.MONGO_URI,
  dbName: process.env.MONGO_DB_NAME,
};

let mysqlPool;
let mongoClient;

function hasDatabaseConfiguration() {
  return Boolean(process.env.MYSQL_HOST || process.env.MYSQL_DATABASE || process.env.MYSQL_USER || process.env.MONGO_URI || process.env.MONGO_DB_NAME);
}

async function getMySQLPool() {
  if (!hasDatabaseConfiguration() || !process.env.MYSQL_HOST) {
    return null;
  }

  if (!mysqlPool) {
    mysqlPool = mysql.createPool(mysqlConfig);
  }

  return mysqlPool;
}

async function getMongoClient() {
  if (!process.env.MONGO_URI) {
    return null;
  }

  if (!mongoClient) {
    mongoClient = new MongoClient(mongoConfig.uri);
    await mongoClient.connect();
  }

  return mongoClient;
}

async function getMongoDb() {
  const client = await getMongoClient();
  if (!client) {
    return null;
  }

  return client.db(mongoConfig.dbName || 'booking_api');
}

async function checkMySQLConnection() {
  const pool = await getMySQLPool();
  if (!pool) {
    return false;
  }

  const [result] = await pool.query('SELECT 1 AS ok');
  return result && result[0] && result[0].ok === 1;
}

async function checkMongoConnection() {
  const db = await getMongoDb();
  if (!db) {
    return false;
  }

  const result = await db.command({ ping: 1 });
  return result && result.ok === 1;
}

async function checkDatabaseConnections() {
  const status = {
    configured: hasDatabaseConfiguration(),
    mysql: false,
    mongodb: false,
  };

  try {
    status.mysql = await checkMySQLConnection();
  } catch (error) {
    status.mysqlError = error.message;
  }

  try {
    status.mongodb = await checkMongoConnection();
  } catch (error) {
    status.mongodbError = error.message;
  }

  return status;
}

module.exports = {
  env,
  mysqlConfig,
  mongoConfig,
  hasDatabaseConfiguration,
  getMySQLPool,
  getMongoClient,
  getMongoDb,
  checkMySQLConnection,
  checkMongoConnection,
  checkDatabaseConnections,
};
