const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function debugGetMyNotes() {
    const client = await pool.connect();
    try {
        const userId = 42; // shashwatdixit22@gmail.com
        console.log(`User ID: ${userId}`);

        const res = await client.query(`
      SELECT 
        id, title, subject, created_at, approval_status, view_count, 
        file_url, pdf_path, rejection_reason,
        university_name, course, field, material_type, state, is_free
      FROM notes 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);

        console.log(`Found ${res.rowCount} notes.`);
        console.table(res.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

debugGetMyNotes();
