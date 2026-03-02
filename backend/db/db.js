const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const connectDB = async () => {
  try {
    await pool.connect();
    console.log('Connected to the database successfully.');
  } catch (err) {
    console.error('Database connection error:', err);
  }
};

module.exports = {
  connectDB,
  pool,
};
