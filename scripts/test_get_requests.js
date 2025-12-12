const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function testQuery() {
    const client = await pool.connect();
    try {
        const userId = 42; // shashwatdixit22@gmail.com
        console.log(`Running query for User ID: ${userId}`);

        const query = `
      SELECT 
        nap.id,
        nap.status,
        nap.created_at,
        n.title AS note_title,
        n.subject AS note_subject,
        n.id AS note_id,
        u.username AS requester_username,
        u.name AS requester_name,
        u.id AS requester_id
      FROM note_access_permissions nap
      JOIN notes n ON nap.note_id = n.id
      JOIN users u ON nap.requester_id = u.id
      WHERE nap.owner_id = $1 
      ORDER BY nap.created_at DESC
    `;

        const res = await client.query(query, [userId]);
        console.log(`Row count: ${res.rowCount}`);
        console.table(res.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

testQuery();
