const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function findUsers() {
    try {
        console.log('--- Searching for "learnify" ---');
        const res = await pool.query("SELECT id, email, role FROM users WHERE email ILIKE '%learnify%'");
        console.log(res.rows);

        console.log('\n--- All Admins ---');
        const admins = await pool.query("SELECT id, email, role FROM users WHERE role = 'admin'");
        console.log(admins.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

findUsers();
