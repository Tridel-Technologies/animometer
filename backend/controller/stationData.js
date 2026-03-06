const { pool } = require('../db/db.js');

const fetchWindData = async (req, res) => {
  const { startDate, endDate, limit, step } = req.query;
  const startTimer = Date.now();
  console.log('Fetch wind data request:', { startDate, endDate, limit, step });

  try {
    let query = `SELECT * FROM tb_wind`;
    const values = [];

    if (startDate && endDate) {
      query += ` WHERE datetime >= $1 AND datetime <= $2`;
      values.push(startDate, endDate);
      
      // If step is provided, use it for sampling (e.g. step=60 for 1-minute data from 1-second storage)
      if (step && !isNaN(parseInt(step))) {
        query += ` AND id % ${parseInt(step)} = 0`;
      }
    }
    
    query += ` ORDER BY datetime DESC`;

    const finalLimit = limit ? parseInt(limit) : 5000; // Default limit to 5000 for safety
    query += ` LIMIT $${values.length + 1}`;
    values.push(finalLimit);

    const result = await pool.query(query, values);
    const duration = Date.now() - startTimer;
    console.log(`Fetch wind data success: ${result.rows.length} rows in ${duration}ms (Step: ${step || 'none'})`);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching wind data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { fetchWindData };
