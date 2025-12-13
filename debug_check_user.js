
const pool = require('./src/config/db');

async function debug() {
    const email = 'shashwatdixit33@gmail.com';
    console.log(`Searching for user: ${email}`);

    try {
        const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userRes.rows.length === 0) {
            console.log('❌ User NOT found by exact match.');
            // Try fuzzy
            const fuzzyRes = await pool.query("SELECT * FROM users WHERE email ILIKE $1", [`%${email}%`]);
            console.log('Fuzzy match results:', fuzzyRes.rows);
            return;
        }

        const user = userRes.rows[0];
        console.log('✅ User Found:', { id: user.id, username: user.username, email: user.email });

        const notesRes = await pool.query("SELECT id, title, user_id FROM notes WHERE user_id = $1", [user.id]);
        console.log(`Found ${notesRes.rows.length} notes for this user.`);
        notesRes.rows.forEach(n => console.log(` - [${n.id}] ${n.title} (Owner: ${n.user_id})`));

        // Check if there are notes with this email but not this user ID (orphan check, unlikely since notes table uses user_id)
        // But maybe check if there are OTHER users with this email?
        const duplicates = await pool.query("SELECT id, email FROM users WHERE email ILIKE $1", [email]);
        if (duplicates.rows.length > 1) {
            console.log('⚠️ DUPLICATE USERS FOUND:', duplicates.rows);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

debug();
