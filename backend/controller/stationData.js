const { pool } = require('../db/db.js');

const fetchWindData = async (req, res) => {
  const { startDate, endDate } = req.query;
  try {
    let query = `SELECT * FROM tb_wind`;
    const values = [];

    if (startDate && endDate) {
      query += ` WHERE datetime >= $1 AND datetime <= $2`;
      values.push(startDate, endDate);
    } else {
        // Default to last 100 records if no dates provided to keep it responsive
        // OR today's data? The user said "initially then page only show the current day's 00:00 to current time"
        // But let's let the frontend handle the default date range.
    }

    query += ` ORDER BY datetime DESC`;
    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching wind data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { fetchWindData };
