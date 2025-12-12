const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log("DB Config Check:", {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    hasPassword: !!process.env.DB_PASS,
    port: process.env.DB_PORT
});

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function deleteUser() {
    try {
        const email = 'shashwatdixit22@gmail.com';
        console.log(`Deleting user with email: ${email}`);

        // Delete from users table
        await pool.query('DELETE FROM pending_registrations WHERE email = $1', [email]);
        await pool.query('DELETE FROM users WHERE email = $1', [email]);
        await pool.query('DELETE FROM otps WHERE email = $1', [email]);

        console.log('User deleted successfully.');
    } catch (err) {
        console.error('Error deleting user:', err);
    } finally {
        await pool.end();
    }
}

deleteUser();
