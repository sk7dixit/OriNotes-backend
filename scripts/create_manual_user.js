const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function createManualUser() {
    const client = await pool.connect();
    try {
        const userData = {
            name: 'khushboo',
            email: 'shashwatdixit33@gmail.com',
            username: 'k7_saini',
            mobile_number: '8546955425',
            password: 'Abc@123',
            role: 'user' // Assuming standard user role
        };

        console.log(`Creating user: ${userData.username} (${userData.email})...`);

        // 1. Hash Password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

        // 2. Insert User
        const query = `
      INSERT INTO users (name, email, username, mobile_number, password, role, is_verified, is_mobile_verified)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)
      RETURNING id, username, email;
    `;

        const values = [
            userData.name,
            userData.email,
            userData.username,
            userData.mobile_number,
            hashedPassword,
            userData.role
        ];

        const res = await client.query(query, values);
        console.log('User created successfully:', res.rows[0]);

    } catch (err) {
        console.error('Error creating user:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

createManualUser();
