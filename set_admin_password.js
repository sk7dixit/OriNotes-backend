const pool = require('./src/config/db');
const bcrypt = require('bcrypt');

async function setAdminPass() {
    try {
        const email = 'learnify887@gmail.com';
        const password = 'Admin@123';
        const hashedPassword = await bcrypt.hash(password, 10);

        await pool.query(
            "UPDATE users SET password = $1 WHERE email = $2",
            [hashedPassword, email]
        );
        console.log(`Password for ${email} set to ${password}`);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

setAdminPass();
