const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function debug() {
    try {
        console.log('--- Debugging Access ---');

        // Check User 'Shashwat'
        const userRes = await pool.query("SELECT id, username, email, role FROM users WHERE username = 'Shashwat' OR email LIKE 'shashwat%'");
        console.log('User Shashwat:', userRes.rows);

        // Check Note 14
        const noteRes = await pool.query("SELECT id, title, user_id, material_type, approval_status FROM notes WHERE id = 14");
        console.log('Note 14:', noteRes.rows);

        if (noteRes.rows.length > 0) {
            const userId = noteRes.rows[0].user_id;
            const ownerRes = await pool.query("SELECT id, username FROM users WHERE id = $1", [userId]);
            console.log('Note Owner:', ownerRes.rows);
        }

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        await pool.end();
    }
}

debug();
