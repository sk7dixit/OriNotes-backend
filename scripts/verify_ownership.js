const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function verifyOwnership() {
    try {
        const email = 'hitanshumishra2005@gmail.com';
        console.log(`🔍 Verifying for: ${email}`);
        const client = await pool.connect();

        // 1. Get User ID
        const userRes = await client.query('SELECT id, email, username FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log('❌ User not found!');
            return;
        }
        const user = userRes.rows[0];
        console.log(`✅ User: ID=${user.id}, Username=${user.username}`);

        // 2. Get Notes by User ID
        const notesRes = await client.query('SELECT id, title, user_id FROM notes WHERE user_id = $1', [user.id]);
        console.log(`📝 Notes by UserID ${user.id}: ${notesRes.rows.length}`);
        notesRes.rows.forEach(n => console.log(` - Note [${n.id}] Owner: ${n.user_id}`));

        // 3. Check if notes exist for this email via JOIN (double check)
        const joinRes = await client.query(`
        SELECT n.id, n.title, n.user_id 
        FROM notes n 
        JOIN users u ON n.user_id = u.id 
        WHERE u.email = $1
    `, [email]);
        console.log(`🔗 Notes via Email Join: ${joinRes.rows.length}`);

        client.release();
    } catch (err) {
        console.error('❌ Verification failed:', err);
    } finally {
        pool.end();
    }
}

verifyOwnership();
