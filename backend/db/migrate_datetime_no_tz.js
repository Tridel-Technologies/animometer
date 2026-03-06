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
        console.log(`Converting tb_wind.datetime to timestamp without time zone...`);
        await pool.query(`
            ALTER TABLE tb_wind ALTER COLUMN datetime TYPE TIMESTAMP WITHOUT TIME ZONE;
        `);
        console.log('Column converted successfully. No more +5:30 offset in DB.');
        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
};

migrate();
