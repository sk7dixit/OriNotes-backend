const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function debugRequests() {
    try {
        console.log('--- Finding User "Test" ---');
        // Search by name or username
        const userRes = await pool.query("SELECT id, username, email, role FROM users WHERE name ILIKE '%Test%' OR username ILIKE '%Test%'");

        if (userRes.rows.length === 0) {
            console.log('No user found with "Test" in name/username.');
            // Fallback: list all users to help identify who "Test" is
            const allUsers = await pool.query("SELECT id, username, name FROM users LIMIT 10");
            console.log('First 10 users:', allUsers.rows);
            return;
        }

        const testUser = userRes.rows[0];
        console.log('Found User:', testUser);

        // Check INCOMING requests (where I am owner)
        console.log('\n--- Incoming Requests (Owner = Test) ---');
        const incoming = await pool.query("SELECT * FROM note_access_permissions WHERE owner_id = $1", [testUser.id]);
        console.log(incoming.rows.length > 0 ? incoming.rows : 'No incoming requests.');

        // Check OUTGOING requests (where I am requester)
        console.log('\n--- Outgoing Requests (Requester = Test) ---');
        const outgoing = await pool.query("SELECT * FROM note_access_permissions WHERE requester_id = $1", [testUser.id]);
        console.log(outgoing.rows.length > 0 ? outgoing.rows : 'No outgoing requests.');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugRequests();
