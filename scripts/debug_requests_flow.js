const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function debugRequestFlow() {
    const client = await pool.connect();
    try {
        const noteId = 13; // From screenshot

        console.log(`--- Checking Note ${noteId} ---`);
        const noteRes = await client.query("SELECT * FROM notes WHERE id = $1", [noteId]);
        if (noteRes.rows.length === 0) {
            console.log("Note not found!");
            return;
        }
        const note = noteRes.rows[0];
        console.log(`Note Title: ${note.title}`);
        console.log(`Note Owner ID: ${note.user_id}`);
        console.log(`Note Approval Status: ${note.approval_status}`);

        // Check Owner
        const ownerRes = await client.query("SELECT * FROM users WHERE id = $1", [note.user_id]);
        const owner = ownerRes.rows[0];
        console.log(`Owner Email: ${owner.email} (ID: ${owner.id})`);

        console.log(`\n--- Checking Permissions for Note ${noteId} ---`);
        const permRes = await client.query("SELECT * FROM note_access_permissions WHERE note_id = $1", [noteId]);

        if (permRes.rows.length === 0) {
            console.log("No permissions found for this note.");
        } else {
            console.table(permRes.rows);
        }

        // Check if there is a mismatch in owner_id in the permissions table
        // The controller might be filtering by permission.owner_id, which needs to match note.user_id
        if (permRes.rows.length > 0) {
            const perm = permRes.rows[0];
            if (perm.owner_id !== note.user_id) {
                console.log(`\n⚠️ CRITICAL MISMATCH:`);
                console.log(`Permission says owner is: ${perm.owner_id}`);
                console.log(`Actual Note owner is: ${note.user_id}`);
            } else {
                console.log("\nPermission owner_id matches Note user_id.");
            }
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

debugRequestFlow();
