const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

(async () => {
    try {
        const targetUsername = 's18_dixit';
        console.log(`Querying for user with username ILIKE '${targetUsername}'...`);

        const res = await pool.query("SELECT id, name, username, email, is_verified, role FROM users WHERE username ILIKE $1", [targetUsername]);

        if (res.rows.length === 0) {
            console.log("❌ User NOT found by username search.");
            // List all usernames to see what's there
            const all = await pool.query("SELECT username FROM users LIMIT 20");
            console.log("Sample Usernames:", all.rows.map(r => r.username));
        } else {
            console.log("✅ User FOUND:", res.rows[0]);
            console.log("Verified:", res.rows[0].is_verified);
            console.log("Username length:", res.rows[0].username.length);
            console.log("Username chars:", res.rows[0].username.split('').map(c => c.charCodeAt(0))); // Check for hidden chars
        }

    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        pool.end();
    }
})();
