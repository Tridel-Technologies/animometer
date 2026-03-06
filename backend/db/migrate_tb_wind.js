const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const migrate = async () => {
    try {
        console.log(`Adding missing columns to tb_wind...`);
        // We use ALTER TABLE ... ADD COLUMN IF NOT EXISTS to be safe
        await pool.query(`
            ALTER TABLE tb_wind ADD COLUMN IF NOT EXISTS humidity NUMERIC;
            ALTER TABLE tb_wind ADD COLUMN IF NOT EXISTS pressure NUMERIC;
            ALTER TABLE tb_wind ADD COLUMN IF NOT EXISTS battery NUMERIC;
        `);
        console.log('Columns added successfully');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
};

migrate();
