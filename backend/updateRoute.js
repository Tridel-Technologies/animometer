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
        
        const targetDate = '2026-03-05';
        console.log(`Resetting and refining path for: ${targetDate}`);

        // 1. Delete existing for this date
        await client.query("DELETE FROM tb_wind WHERE datetime >= $1 AND datetime < $2", [targetDate + ' 00:00:00', targetDate + ' 23:59:59.999']);
        
        const startLat = 11.1;
        const startLon = 75.5;
        const endLat = 10.8;
        const endLon = 74.9;

        const dLat = endLat - startLat;
        const dLon = endLon - startLon;
        
        const totalDistKm = Math.sqrt(Math.pow(dLat * 111, 2) + Math.pow(dLon * 109, 2));
        const fraction = 10 / totalDistKm;

        const targetLat = startLat + dLat * fraction;
        const targetLon = startLon + dLon * fraction;

        const numPoints = 20;
        for (let i = 0; i < numPoints; i++) {
            const f = i / (numPoints - 1);
            
            let lat = startLat + (targetLat - startLat) * f;
            let lon = startLon + (targetLon - startLon) * f;
            
            // Apply nearness offset (nudging it slightly north and east of the route)
            lat += 0.005; 
            lon += 0.008;

            // Add slight jitter
            lat += (Math.random() - 0.5) * 0.001;
            lon += (Math.random() - 0.5) * 0.001;

            // Month index 2 is March
            const dt = new Date(Date.UTC(2026, 2, 5, 8 + Math.floor(i/2), (i%2)*30, 0));
            
            await client.query(`
                INSERT INTO tb_wind (datetime, lat, lon, wind_uv, wind_uy, wind_uz, temp, pressure)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [dt, lat, lon, 0, 0, 0, 28, 1012]);
        }
        
        await client.query('COMMIT');
        console.log("Database updated: 5th March 2026 path is now 'near' the route and moves 10km.");
    } catch(err) {
        await client.query('ROLLBACK');
        console.error(err);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
}

run();
