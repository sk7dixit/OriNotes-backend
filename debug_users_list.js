const pool = require('./src/config/db');

async function listUsers() {
    try {
        console.log("Listing all users...");
        const res = await pool.query("SELECT id, username, email FROM users");
        res.rows.forEach(u => console.log(`ID: ${u.id}, Username: ${u.username}, Email: ${u.email}`));
    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        process.exit(0);
    }
}

listUsers();
