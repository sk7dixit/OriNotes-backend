const pool = require('./src/config/db');
const bcrypt = require('bcrypt');

async function resetPassword() {
    try {
        const email = 'learnify887@gmail.com';
        const newPassword = 'Abc@1234';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        console.log(`Resetting password for ${email}...`);

        const res = await pool.query('UPDATE users SET password = $1 WHERE email = $2 RETURNING id', [hashedPassword, email]);

        if (res.rowCount > 0) {
            console.log('Password reset successful.');
        } else {
            console.log('User not found.');
        }

    } catch (err) {
        console.error('Error resetting password:', err);
    } finally {
        await pool.end();
    }
}

resetPassword();
