const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function insertTestNote() {
    try {
        const email = 'shashwatdixit33@gmail.com';
        const client = await pool.connect();

        // 1. Get User ID
        const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.log('❌ User not found!');
            return;
        }
        const userId = userRes.rows[0].id;

        // 2. Insert Note
        const insertRes = await client.query(`
        INSERT INTO notes (
            user_id, title, subject, university_name, 
            course, material_type, state, approval_status,
            view_count, created_at
        ) VALUES (
            $1, 'Test Note Debug', 'Debugging', 'Test Uni', 
            'B.Tech', 'user_material', 'Test State', 'approved',
            10, NOW()
        ) RETURNING id;
    `, [userId]);

        console.log(`✅ Inserted Test Note ID: ${insertRes.rows[0].id}`);

        client.release();
    } catch (err) {
        console.error('❌ Insert failed:', err);
    } finally {
        pool.end();
    }
}

insertTestNote();
