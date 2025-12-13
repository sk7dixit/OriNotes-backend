const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkUserNotes() {
    try {
        const email = 'shashwatdixit33@gmail.com'; // From screenshot
        console.log(`🔍 Checking notes for user: ${email}`);

        const client = await pool.connect();

        // 1. Get User ID
        const userRes = await client.query('SELECT id, username, email FROM users WHERE email = $1', [email]);

        if (userRes.rows.length === 0) {
            console.log('❌ User not found!');
            client.release();
            return;
        }

        const user = userRes.rows[0];
        console.log('✅ User Found:', user);

        // 2. Get Notes
        const notesRes = await client.query('SELECT id, title, approval_status, created_at, material_type FROM notes WHERE user_id = $1', [user.id]);

        console.log(`📝 Notes Found: ${notesRes.rows.length}`);
        notesRes.rows.forEach(note => {
            console.log(` - [${note.id}] ${note.title} (${note.approval_status}) Type: ${note.material_type}`);
        });

        client.release();
    } catch (err) {
        console.error('❌ Check failed:', err);
    } finally {
        pool.end();
    }
}

checkUserNotes();
