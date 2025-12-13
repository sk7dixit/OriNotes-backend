const pool = require('./src/config/db.js');
const bcrypt = require('bcrypt');

const verifyLogin = async () => {
    console.log('🔐 Verifying Admin Login...');
    const email = 'learnify887@gmail.com';
    const passwordAttempt = 'Admin123!'; // The correct password

    try {
        const res = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (res.rowCount === 0) {
            console.log('❌ User not found');
            return;
        }

        const user = res.rows[0];
        const match = await bcrypt.compare(passwordAttempt, user.password);

        if (match) {
            console.log('✅ Login SUCCESS! Password is correct.');
        } else {
            console.log('❌ Login FAILED. Password incorrect.');
        }
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
};

verifyLogin();
