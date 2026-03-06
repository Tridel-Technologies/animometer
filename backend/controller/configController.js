const { pool } = require('../db/db.js');

const getSensorConfig = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tb_sensor_config ORDER BY id ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateSensorConfig = async (req, res) => {
    const { configs } = req.body; // Expecting an array of config objects
    try {
        // We use a transaction to update all configs at once
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const config of configs) {
                const { parameter_id, unit, threshold_value, has_threshold } = config;
                await client.query(
                    'UPDATE tb_sensor_config SET unit = $1, threshold_value = $2, has_threshold = $3, updated_at = CURRENT_TIMESTAMP WHERE parameter_id = $4',
                    [unit, threshold_value, has_threshold, parameter_id]
                );
            }
            await client.query('COMMIT');
            res.status(200).json({ message: 'Sensor configuration updated successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getInitialUnits = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tb_initial_units ORDER BY id ASC');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateInitialUnits = async (req, res) => {
    const { units } = req.body; // Expecting an array of {parameter_id, unit}
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const item of units) {
                const { parameter_id, unit } = item;
                await client.query(
                    'INSERT INTO tb_initial_units (parameter_id, unit) VALUES ($1, $2) ON CONFLICT (parameter_id) DO UPDATE SET unit = $2, updated_at = CURRENT_TIMESTAMP',
                    [parameter_id, unit]
                );
            }
            await client.query('COMMIT');
            res.status(200).json({ message: 'Initial units updated successfully' });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getStation = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tb_stations LIMIT 1');
        res.status(200).json(result.rows[0] || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateStation = async (req, res) => {
    const { name, parameters_list } = req.body;
    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Upsert station (only one station supported for now as per requirement)
            const result = await client.query(`
                INSERT INTO tb_stations (id, name, parameters_list, updated_at)
                VALUES (1, $1, $2, CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET 
                    name = EXCLUDED.name, 
                    parameters_list = EXCLUDED.parameters_list,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [name, JSON.stringify(parameters_list || [])]);

            // Update all existing wind data rows
            await client.query('UPDATE tb_wind SET station_name = $1', [name]);

            await client.query('COMMIT');
            res.status(200).json({ message: 'Station updated successfully', station: result.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getSensorConfig,
    updateSensorConfig,
    getInitialUnits,
    updateInitialUnits,
    getStation,
    updateStation
};
