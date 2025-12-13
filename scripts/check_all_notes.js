const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkAllNotes() {
    try {
        const client = await pool.connect();

        const countRes = await client.query('SELECT COUNT(*) FROM notes');
        console.log(`📊 Total Notes in DB: ${countRes.rows[0].count}`);

        const notesRes = await client.query(`
        SELECT n.id, n.title, u.email, n.created_at 
        FROM notes n 
        JOIN users u ON n.user_id = u.id 
        ORDER BY n.created_at DESC LIMIT 5
    `);

        console.log('📝 Last 5 Notes:');
        notesRes.rows.forEach(n => {
            console.log(` - [${n.id}] ${n.title} (User: ${n.email})`);
        });

        client.release();
    } catch (err) {
        console.error('❌ Check failed:', err);
    } finally {
        pool.end();
    }
}

checkAllNotes();
