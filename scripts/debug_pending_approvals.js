const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function debugPending() {
    const client = await pool.connect();
    try {
        const ownerId = 42; // shashwatdixit22@gmail.com

        console.log(`--- Pending Requests for Owner ${ownerId} ---`);
        const res = await client.query("SELECT * FROM note_access_permissions WHERE owner_id = $1 AND status = 'pending'", [ownerId]);

        if (res.rows.length === 0) {
            console.log("No pending requests found.");
            return;
        }

        console.table(res.rows);
        const requestId = res.rows[0].id;
        console.log(`\nAttempting to approve Request ID: ${requestId}...`);

        // Simulate the exact query from noteController.js
        const updateRes = await client.query(
            `UPDATE note_access_permissions SET status = $1 WHERE id = $2 AND owner_id = $3 RETURNING *`,
            ['approved', requestId, ownerId]
        );

        if (updateRes.rowCount > 0) {
            console.log("✅ Simulation Successful: Request Approved.");
            console.log(updateRes.rows[0]);
        } else {
            console.log("❌ Simulation Failed: No rows updated.");
        }

    } catch (err) {
        console.error("❌ Simulation Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

debugPending();
