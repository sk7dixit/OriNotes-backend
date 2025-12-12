const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function promote() {
    try {
        console.log('--- Promoting User to Admin ---');
        // Promoting both 'Shashwat' users just in case
        await pool.query("UPDATE users SET role = 'admin' WHERE username IN ('s18_dixit', 'shashwatdixit33')");
        console.log('✅ Users s18_dixit and shashwatdixit33 promoted to admin.');
    } catch (err) {
        console.error('Promotion failed:', err);
    } finally {
        await pool.end();
    }
}

promote();
