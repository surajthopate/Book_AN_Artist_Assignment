const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

async function seedMysql() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD || '',
  });

  const dbName = process.env.MYSQL_DATABASE;
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
  await connection.query(`USE \`${dbName}\`;`);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('artist', 'client') NOT NULL,
      name VARCHAR(255) NOT NULL,
      artist_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      artist_id INT NOT NULL,
      client_id INT NOT NULL,
      status VARCHAR(50) NOT NULL,
      event_start DATETIME NOT NULL,
      event_end DATETIME NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('MySQL seed complete.');
  await connection.end();
}

async function seedMongo() {
  const uri = process.env.MONGO_URI;
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db(process.env.MONGO_DB_NAME);
  const artistProfiles = db.collection('artist_profiles');
  const reviews = db.collection('reviews');

  await artistProfiles.updateOne(
    { artist_id: 1 },
    {
      $setOnInsert: {
        artist_id: 1,
        name: 'Ava Stone',
        category: 'Music',
        bio: 'Singer and event performer',
        hourly_rate: 250,
        created_at: new Date(),
      },
    },
    { upsert: true }
  );

  await reviews.updateOne(
    { review_id: 1 },
    {
      $setOnInsert: {
        review_id: 1,
        artist_id: 1,
        booking_id: 3,
        client_id: 2,
        score: 5,
        comment: 'Excellent performance and smooth coordination.',
        created_at: new Date(),
      },
    },
    { upsert: true }
  );

  console.log('MongoDB seed complete.');
  await client.close();
}

(async () => {
  try {
    await seedMysql();
    await seedMongo();
    console.log('Database seeding finished successfully.');
  } catch (error) {
    console.error('Database seeding failed. Make sure MySQL and MongoDB are installed and running locally before running this script.');
    console.error(error.message);
    process.exitCode = 1;
  }
})();
