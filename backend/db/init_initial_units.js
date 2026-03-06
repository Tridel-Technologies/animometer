const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const initInitialUnits = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tb_initial_units (
                id SERIAL PRIMARY KEY,
                parameter_id VARCHAR(50) UNIQUE NOT NULL,
                unit VARCHAR(20) NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('tb_initial_units table initialized successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error initializing initial units table:', err);
        process.exit(1);
    }
};

initInitialUnits();
