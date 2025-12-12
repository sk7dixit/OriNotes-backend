const pool = require('./src/config/db');

async function listUsers() {
    try {
        const res = await pool.query('SELECT id, email, username, role FROM users');
        console.log('Users found:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

listUsers();
