const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function registerManually() {
    try {
        const name = 'Shashwat DIxit';
        const username = 's18_dixit';
        const email = 'shashwatdixit22@gmail.com';
        const password = 'Abc@1234';
        const mobileNumber = '9999999999';
        const role = 'user';

        console.log(`Hashing password for: ${email}`);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        console.log('Inserting user into database...');
        // matches createUser signature logic: name, email, password, role, profile_pic, mobile_number, username
        const query = `
      INSERT INTO users (name, email, password, role, mobile_number, username)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

        const res = await pool.query(query, [name, email, hashedPassword, role, mobileNumber, username]);

        console.log('User registered manually:', res.rows[0]);
    } catch (err) {
        console.error('Error registering manual user:', err);
    } finally {
        await pool.end();
    }
}

registerManually();
