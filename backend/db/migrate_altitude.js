const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5433'),
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
});

const migrate = async () => {
    try {
        console.log(`Adding altitude column to tb_wind...`);
        await pool.query(`
            ALTER TABLE tb_wind ADD COLUMN IF NOT EXISTS altitude NUMERIC;
        `);
        console.log('Column altitude added to tb_wind successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
};

migrate();
