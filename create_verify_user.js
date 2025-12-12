const pool = require('./src/config/db');
const bcrypt = require('bcrypt');

async function run() {
    try {
        const hash = await bcrypt.hash('password123', 10);
        const email = 'verifier@example.com';
        // Check if exists
        const res = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
        if (res.rowCount > 0) {
            // Update password
            await pool.query("UPDATE users SET password=$1 WHERE email=$2", [hash, email]);
            console.log("User verifier@example.com updated with password 'password123'");
        } else {
            await pool.query(
                "INSERT INTO users (name, email, password, username, role, is_verified) VALUES ($1, $2, $3, $4, $5, true)",
                ['Verifier', email, hash, 'verifier', 'user']
            );
            console.log("User verifier@example.com created with password 'password123'");
        }
    } catch (e) { console.error(e); }
    process.exit();
}
run();
