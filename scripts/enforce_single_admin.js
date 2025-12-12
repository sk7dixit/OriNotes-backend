const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function enforceSingleAdmin() {
    const client = await pool.connect();
    try {
        const targetAdminEmail = 'learnify887@gmail.com'; // Corrected based on DB search (was learnify88&)
        // Also check for standard email just in case of typo, for logging purposes
        const typoCheck = 'learnify88@gmail.com';

        console.log(`Checking for target user: ${targetAdminEmail}...`);

        const userRes = await client.query("SELECT id, email, role FROM users WHERE email = $1", [targetAdminEmail]);

        if (userRes.rows.length === 0) {
            console.log(`⚠️ User ${targetAdminEmail} NOT FOUND.`);
            // Check typo
            const typoRes = await client.query("SELECT id, email, role FROM users WHERE email = $1", [typoCheck]);
            if (typoRes.rows.length > 0) {
                console.log(`Did you mean ${typoCheck}? (Found this user with role: ${typoRes.rows[0].role})`);
            }
            return;
        }

        const targetUser = userRes.rows[0];
        console.log(`Found target user. ID: ${targetUser.id}, Current Role: ${targetUser.role}`);

        await client.query('BEGIN');

        // 1. Set all users to 'user'
        const demoteRes = await client.query("UPDATE users SET role = 'user' WHERE email != $1", [targetAdminEmail]);
        console.log(`Demoted ${demoteRes.rowCount} users to 'user'.`);

        // 2. Set target user to 'admin'
        const promoteRes = await client.query("UPDATE users SET role = 'admin' WHERE email = $1", [targetAdminEmail]);
        console.log(`Promoted/Confirmed ${targetAdminEmail} as 'admin'.`);

        await client.query('COMMIT');
        console.log('✅ Single admin enforcement complete.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error enforcing admin:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

enforceSingleAdmin();
