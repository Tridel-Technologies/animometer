const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function check() {
    try {
        const res = await pool.query('SELECT * FROM tb_wind ORDER BY datetime DESC LIMIT 5');
        console.log('Fields:', res.fields.map(f => f.name));
        console.log('Sample Data:', res.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}
check();
