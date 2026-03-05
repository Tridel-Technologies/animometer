const { pool } = require('../db/db.js');

// Fetch all cruises and their nested stations
const getCruises = async (req, res) => {
    try {
        const cruisesQuery = `SELECT * FROM ship_cruises ORDER BY created_at DESC`;
        const cruisesResult = await pool.query(cruisesQuery);

        const stationsQuery = `SELECT * FROM cruise_stations ORDER BY cruise_id, station_order ASC`;
        const stationsResult = await pool.query(stationsQuery);

        // Group stations into their respective cruises
        const cruises = cruisesResult.rows.map(cruise => {
            // mapping DB snake_case to JS camelCase
            return {
                id: cruise.id,
                vessel: cruise.vessel,
                project: cruise.project,
                chiefScientist: cruise.chief_scientist,
                startDate: cruise.start_date,
                endDate: cruise.end_date,
                duration: cruise.duration,
                departurePort: cruise.departure_port,
                arrivalPort: cruise.arrival_port,
                studyArea: cruise.study_area,
                samplePlan: cruise.sample_plan,
                equipment: cruise.equipment,
                status: cruise.status,
                stations: stationsResult.rows
                    .filter(st => st.cruise_id === cruise.id)
                    .map(st => ({
                        id: st.id,
                        name: st.name,
                        latitude: Number(st.latitude),
                        longitude: Number(st.longitude),
                        activity: st.activity,
                        stationOrder: st.station_order
                    }))
            };
        });

        res.status(200).json(cruises);
    } catch (error) {
        console.error('Error fetching ship cruises:', error);
        res.status(500).json({ error: 'Internal server error while fetching cruises' });
    }
};

// Create or update a cruise with its stations
const saveCruise = async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            id, vessel, project, chiefScientist, startDate, endDate, duration,
            departurePort, arrivalPort, studyArea, samplePlan, equipment, status, stations
        } = req.body;

        if (!id || !vessel || !project || !startDate || !endDate || !departurePort || !arrivalPort) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await client.query('BEGIN');

        // 1. Insert/Update into ship_cruises (UPSERT via ON CONFLICT)
        const upsertCruiseQuery = `
      INSERT INTO ship_cruises (
        id, vessel, project, chief_scientist, start_date, end_date, 
        duration, departure_port, arrival_port, study_area, sample_plan, equipment, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET 
        vessel = EXCLUDED.vessel,
        project = EXCLUDED.project,
        chief_scientist = EXCLUDED.chief_scientist,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        duration = EXCLUDED.duration,
        departure_port = EXCLUDED.departure_port,
        arrival_port = EXCLUDED.arrival_port,
        study_area = EXCLUDED.study_area,
        sample_plan = EXCLUDED.sample_plan,
        equipment = EXCLUDED.equipment,
        status = EXCLUDED.status
    `;

        await client.query(upsertCruiseQuery, [
            id, vessel, project, chiefScientist, startDate, endDate,
            duration, departurePort, arrivalPort, studyArea, samplePlan, equipment, status
        ]);

        // 2. Delete existing stations for this cruise before inserting new ones
        await client.query(`DELETE FROM cruise_stations WHERE cruise_id = $1`, [id]);

        // 3. Insert new stations array
        if (stations && stations.length > 0) {
            const insertStationQuery = `
        INSERT INTO cruise_stations (cruise_id, name, latitude, longitude, activity, station_order)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;
            for (let i = 0; i < stations.length; i++) {
                const st = stations[i];
                if (st.latitude && st.longitude) {
                    await client.query(insertStationQuery, [
                        id, st.name || `Station ${i + 1}`, st.latitude, st.longitude, st.activity, i + 1
                    ]);
                }
            }
        }

        await client.query('COMMIT');
        res.status(201).json({ message: 'Cruise outline saved successfully', id });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saving cruise details:', error);
        res.status(500).json({ error: 'Internal server error while saving cruise' });
    } finally {
        client.release();
    }
};

module.exports = {
    getCruises,
    saveCruise
};
