const { pool } = require('./db/db');
const bcrypt = require('bcrypt');

async function createAdmin() {
    try {
        const hash = await bcrypt.hash('admin123', 10);
        await pool.query(
            "INSERT INTO users (name, email, role, designation, password) VALUES ('Admin', 'admin@trideltechnologies.com', 'Administrator', 'Navigation Officer', $1) ON CONFLICT (email) DO NOTHING",
            [hash]
        );
        console.log('Admin user ensured');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
createAdmin();
