const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/.env' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query("DELETE FROM ship_cruises WHERE id = 'TEST-05-MAR-26'");
        
        const insertQuery = `INSERT INTO ship_cruises (
            id, vessel, project, chief_scientist, start_date, end_date, 
            duration, departure_port, arrival_port, study_area, sample_plan, equipment, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`;
        
        await client.query(insertQuery, [
            'TEST-05-MAR-26', 'RV Sagar Kanya', 'March 5 10km Test', 'Dr. Smith', '2026-03-01T00:00:00Z', '2026-03-10T23:59:59Z',
            10, 'Port A', 'Port B', 'Arabian Sea', 'Test 10km path', 'GPS', 'Planned'
        ]);
        
        await client.query("DELETE FROM cruise_stations WHERE cruise_id = 'TEST-05-MAR-26'");
        
        await client.query('INSERT INTO cruise_stations (cruise_id, name, latitude, longitude, activity, station_order) VALUES ($1, $2, $3, $4, $5, $6)', [
            'TEST-05-MAR-26', 'Start Point', 11.1, 75.5, 'Departure', 1
        ]);
        await client.query('INSERT INTO cruise_stations (cruise_id, name, latitude, longitude, activity, station_order) VALUES ($1, $2, $3, $4, $5, $6)', [
            'TEST-05-MAR-26', 'End Point', 10.8, 74.9, 'Arrival', 2
        ]);
        
        await client.query('COMMIT');
        console.log('Test schedule added for March 5th 2026');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

run();
