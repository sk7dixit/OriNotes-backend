const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function checkUserNotes() {
    try {
        const email = 'shashwatdixit22@gmail.com';
        const userRes = await pool.query("SELECT id, username, role FROM users WHERE email = $1", [email]);

        if (userRes.rows.length === 0) {
            console.log('User not found.');
            return;
        }

        const { id, username, role } = userRes.rows[0];
        console.log(`User Found: ${username} (ID: ${id}, Role: ${role})`);

        const notesRes = await pool.query("SELECT id, title, approval_status FROM notes WHERE user_id = $1", [id]);
        console.log(`Notes count: ${notesRes.rows.length}`);
        notesRes.rows.forEach(n => console.log(` - ${n.title} (${n.approval_status})`));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkUserNotes();
