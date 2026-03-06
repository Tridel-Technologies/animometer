const { Pool } = require('pg');
require('dotenv').config(); // Automatically looks for .env in current directory (backend)

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const setupTrigger = async () => {
    try {
        console.log(`Connecting to ${process.env.DB_NAME} on port ${process.env.DB_PORT}...`);
        await pool.query(`
            -- Function to notify on wind data insertion
            CREATE OR REPLACE FUNCTION notify_wind_data_change() 
            RETURNS trigger AS $$
            BEGIN
              PERFORM pg_notify('wind_data_updated', row_to_json(NEW)::text);
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            -- Trigger to execute the function after each insert
            DROP TRIGGER IF EXISTS wind_data_update_trigger ON tb_wind;
            CREATE TRIGGER wind_data_update_trigger
            AFTER INSERT ON tb_wind
            FOR EACH ROW
            EXECUTE FUNCTION notify_wind_data_change();
        `);
        console.log('Database trigger for WebSockets setup successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error setting up DB trigger:', err);
        process.exit(1);
    }
};

setupTrigger();
