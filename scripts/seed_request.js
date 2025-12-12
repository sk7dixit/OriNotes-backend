const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function seedRequest() {
    const client = await pool.connect();
    try {
        const userId = 31; // shashwatdixit33 (Test)
        const requesterId = 40; // learnify887 (Admin)

        console.log(`Seeding data for User ${userId}...`);

        // 1. Create a dummy note for User 31
        const noteRes = await client.query(`
      INSERT INTO notes (title, user_id, pdf_path, approval_status, is_free, material_type, university_name)
      VALUES ('Test Note for Request', $1, 'dummy_path.pdf', 'approved', FALSE, 'university_material', 'Test Univ')
      RETURNING id, title
    `, [userId]);

        const note = noteRes.rows[0];
        console.log(`✅ Created Note: ${note.title} (ID: ${note.id})`);

        // 2. Create Access Request from Admin
        await client.query(`
      INSERT INTO note_access_permissions (note_id, owner_id, requester_id, status)
      VALUES ($1, $2, $3, 'pending')
    `, [note.id, userId, requesterId]);

        console.log(`✅ Created Access Request from User ${requesterId} for Note ${note.id}`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

seedRequest();
