const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const migrate = async () => {
    try {
        console.log('Migrating database for station support...');
        
        // 1. Add station_name to tb_wind
        await pool.query(`
            ALTER TABLE tb_wind ADD COLUMN IF NOT EXISTS station_name VARCHAR(100);
        `);
        console.log('Added station_name to tb_wind');

        // 2. Create tb_stations table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tb_stations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                parameters_list JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created tb_stations table');

        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
};

migrate();
