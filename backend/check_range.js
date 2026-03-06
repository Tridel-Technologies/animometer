const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkRange() {
    try {
        // Mock range for today in IST
        const start = '2026-03-04T18:30:00.000Z';
        const end = '2026-03-05T18:29:59.999Z';

        const res = await pool.query('SELECT COUNT(*) FROM tb_wind WHERE datetime >= $1 AND datetime <= $2', [start, end]);
        console.log('Count in range:', res.rows[0].count);
        
        const latest = await pool.query('SELECT datetime FROM tb_wind ORDER BY datetime DESC LIMIT 1');
        console.log('Latest record datetime:', latest.rows[0]?.datetime);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
checkRange();
