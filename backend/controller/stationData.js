const { pool } = require('../db/db.js');

const fetchWindData = async (req, res) => {
  try {
    const query = `SELECT * FROM tb_wind ORDER BY datetime `;
    const result = await pool.query(query);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching wind data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { fetchWindData };
