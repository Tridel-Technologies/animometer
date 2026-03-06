const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const initSensorConfig = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tb_sensor_config (
                id SERIAL PRIMARY KEY,
                parameter_id VARCHAR(50) UNIQUE NOT NULL,
                parameter_name VARCHAR(100) NOT NULL,
                unit VARCHAR(20) NOT NULL,
                threshold_value DOUBLE PRECISION,
                has_threshold BOOLEAN DEFAULT TRUE,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            INSERT INTO tb_sensor_config (parameter_id, parameter_name, unit, threshold_value, has_threshold) VALUES
                ('wind_ux', 'Wind UX', 'm/s', 15.0, TRUE),
                ('wind_uy', 'Wind UY', 'm/s', 15.0, TRUE),
                ('wind_uz', 'Wind UZ', 'm/s', 10.0, TRUE),
                ('rain', 'Rainfall', 'mm', 50.0, TRUE),
                ('temp', 'Temperature', '°C', 40.0, TRUE),
                ('solar', 'Solar Radiation', 'W/m²', 1000.0, TRUE),
                ('humidity', 'Humidity', '%RH', 90.0, TRUE),
                ('pressure', 'Pressure', 'hPa', 1020.0, TRUE),
                ('battery', 'Battery', 'V', 12.0, TRUE),
                ('wind_speed', 'Wind Speed', 'm/s', 25.0, TRUE),
                ('wind_direction', 'Wind Direction', '°', 360.0, FALSE)
            ON CONFLICT (parameter_id) DO UPDATE SET 
                parameter_name = EXCLUDED.parameter_name;
        `);
        console.log('tb_sensor_config table initialized successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error initializing sensor config table:', err);
        process.exit(1);
    }
};

initSensorConfig();
