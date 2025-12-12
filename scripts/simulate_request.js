const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function simulate() {
    const client = await pool.connect();
    try {
        // 1. Identify "Test" User (User seeing the empty screen)
        // The screenshot showed "T" avatar and name "Test"
        const testUserRes = await client.query("SELECT * FROM users WHERE name ILIKE 'Test%' OR username ILIKE 'Test%' LIMIT 1");
        // Fallback if not found by name, assume it's the one we just worked with or shashwatdixit33
        let testUser = testUserRes.rows[0];

        if (!testUser) {
            console.log("Could not find user 'Test'. Using shashwatdixit33 as fallback.");
            const fallback = await client.query("SELECT * FROM users WHERE email = 'shashwatdixit33@gmail.com'");
            testUser = fallback.rows[0];
        }

        if (!testUser) {
            console.error("❌ Could not find a target user to receive the request.");
            return;
        }
        console.log(`Target User (Owner): ${testUser.username} (ID: ${testUser.id})`);

        // 2. Check if they have a note
        const noteRes = await client.query("SELECT * FROM notes WHERE user_id = $1 LIMIT 1", [testUser.id]);
        if (noteRes.rows.length === 0) {
            console.log("⚠️ This user has NO NOTES. Cannot request access.");
            // Create a dummy note? No, that's too much.
            return;
        }
        const note = noteRes.rows[0];
        console.log(`Found Note: ${note.title} (ID: ${note.id})`);

        // 3. Find a requester (Admin: learnify887)
        const requesterRes = await client.query("SELECT * FROM users WHERE email = 'learnify887@gmail.com'");
        if (requesterRes.rows.length === 0) throw new Error("Requester not found");
        const requester = requesterRes.rows[0];
        console.log(`Requester: ${requester.username} (ID: ${requester.id})`);

        // 4. Create Request
        const insertRes = await client.query(`
        INSERT INTO note_access_permissions (note_id, owner_id, requester_id, status)
        VALUES ($1, $2, $3, 'pending')
        ON CONFLICT (note_id, requester_id) DO UPDATE SET status = 'pending'
        RETURNING *
    `, [note.id, testUser.id, requester.id]);

        console.log("✅ Request Created/Reset to Pending:", insertRes.rows[0]);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

simulate();
