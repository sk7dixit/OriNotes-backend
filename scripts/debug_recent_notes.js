const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function findRecentNotes() {
    try {
        console.log('--- Most Recent Notes ---');
        const res = await pool.query(`
      SELECT n.id, n.title, n.user_id, n.created_at, u.username, u.email
      FROM notes n
      LEFT JOIN users u ON n.user_id = u.id
      ORDER BY n.created_at DESC
      LIMIT 10
    `);

        console.table(res.rows.map(r => ({
            id: r.id,
            title: r.title,
            created: r.created_at,
            user_id: r.user_id,
            user_email: r.email
        })));

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findRecentNotes();
