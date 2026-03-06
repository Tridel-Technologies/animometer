const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                permissions JSONB DEFAULT '{}'
            );

            CREATE TABLE IF NOT EXISTS designations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                role VARCHAR(100),
                designation VARCHAR(100),
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Initial data
            INSERT INTO roles (name, permissions) VALUES 
                ('Administrator', '{"dashboard": true, "reports": true, "analysis": true, "users": true, "settings": true}'), 
                ('Operator', '{"dashboard": true, "reports": true, "analysis": true, "users": false, "settings": false}'), 
                ('Viewer', '{"dashboard": true, "reports": true, "analysis": false, "users": false, "settings": false}')
            ON CONFLICT (name) DO NOTHING;
            
            INSERT INTO designations (name) VALUES ('Navigation Officer'), ('Technical Engineer'), ('Deck Cadet'), ('Chief Mate') ON CONFLICT DO NOTHING;
        `);
        console.log('Tables created successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error creating tables:', err);
        process.exit(1);
    }
};

initDB();
