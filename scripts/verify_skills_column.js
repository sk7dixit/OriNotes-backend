const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function verifySchema() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'skills';
    `);

        if (res.rows.length > 0) {
            console.log("✅ 'skills' column exists. Type:", res.rows[0].data_type);
        } else {
            console.log("❌ 'skills' column does NOT exist.");
        }
    } catch (err) {
        console.error("Error confirming schema:", err);
    } finally {
        await pool.end();
    }
}

verifySchema();
