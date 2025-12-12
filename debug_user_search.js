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
        const searchTerm = '%a%'; // Broad search
        console.log(`Searching for users with term: ${searchTerm}`);

        const result = await pool.query(
            `SELECT id, name, username 
       FROM users 
       WHERE (name ILIKE $1 OR username ILIKE $1) 
       AND is_verified = true
       LIMIT 10`,
            [searchTerm]
        );

        console.log("Search Results:", result.rows);

        if (result.rows.length === 0) {
            // Check if ANY users exist
            const allUsers = await pool.query("SELECT count(*) FROM users");
            console.log("Total users in DB:", allUsers.rows[0].count);
        }

    } catch (err) {
        console.error("Search Test Failed:", err);
    } finally {
        pool.end();
    }
})();
