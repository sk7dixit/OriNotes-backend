const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function checkAllNotes() {
    try {
        console.log('--- User Note Counts ---');
        const res = await pool.query(`
      SELECT u.id, u.username, u.email, COUNT(n.id) as note_count
      FROM users u
      LEFT JOIN notes n ON u.id = n.user_id
      GROUP BY u.id
      ORDER BY note_count DESC
    `);

        console.table(res.rows.map(r => ({
            id: r.id,
            username: r.username,
            email: r.email,
            count: r.note_count
        })));

        console.log('\n--- Details for shashwatdixit22@gmail.com ---');
        const specific = await pool.query(`
      SELECT u.id, u.email, n.id as note_id, n.title, n.user_id as note_user_id
      FROM users u
      LEFT JOIN notes n ON u.id = n.user_id
      WHERE u.email = 'shashwatdixit22@gmail.com'
    `);
        console.log(specific.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkAllNotes();
