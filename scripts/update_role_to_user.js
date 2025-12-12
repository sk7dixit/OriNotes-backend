require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'learnify',
    password: process.env.DB_PASS || '',
    port: process.env.DB_PORT || 5432,
});

async function updateRole() {
    const email = 'shashwatdixit22@gmail.com';

    try {
        const res = await pool.query(
            "UPDATE users SET role = 'user' WHERE email = $1 RETURNING *",
            [email]
        );

        if (res.rowCount === 0) {
            console.log(`❌ No user found with email: ${email}`);
        } else {
            console.log(`✅ Successfully updated role to 'user' for: ${email}`);
            console.log('User details:', res.rows[0]);
        }
    } catch (err) {
        console.error('❌ Error updating role:', err);
    } finally {
        await pool.end();
    }
}

updateRole();
