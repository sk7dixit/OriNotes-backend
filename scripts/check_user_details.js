const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function checkDetails() {
    const client = await pool.connect();
    try {
        const ids = [31, 42];
        console.log(`Checking details for Users: ${ids.join(', ')}`);

        const res = await client.query(`
      SELECT id, username, email, name, role
      FROM users
      WHERE id = ANY($1)
    `, [ids]);

        console.table(res.rows);

        // Also check for any user with 0 notes
        const zeroNotes = await client.query(`
        SELECT u.id, u.email, COUNT(n.id) as count
        FROM users u
        LEFT JOIN notes n ON u.id = n.user_id
        GROUP BY u.id
        HAVING COUNT(n.id) = 0
        LIMIT 5
    `);
        console.log("\nUsers with 0 notes (potential confusion):");
        console.table(zeroNotes.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

checkDetails();
