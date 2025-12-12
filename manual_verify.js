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

async function verifyUser() {
    try {
        const email = 'shashwatdixit22@gmail.com';
        console.log(`Verifying user: ${email}`);

        const query = `UPDATE users SET is_verified = TRUE WHERE email = $1 RETURNING *`;
        const res = await pool.query(query, [email]);

        if (res.rowCount > 0) {
            console.log('User verified manually:', res.rows[0].email);
        } else {
            console.log('User not found.');
        }

    } catch (err) {
        console.error('Error verifying user:', err);
    } finally {
        await pool.end();
    }
}

verifyUser();
