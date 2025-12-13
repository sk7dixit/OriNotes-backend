const pool = require('./src/config/db.js');
const bcrypt = require('bcrypt');

const resetAdminPassword = async () => {
    console.log('🔐 Resetting Admin Password...');
    const email = 'learnify887@gmail.com';
    const newPassword = 'Admin123!';

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const res = await pool.query(
            `UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email`,
            [hashedPassword, email]
        );

        if (res.rowCount > 0) {
            console.log(`✅ Password updated for ${email}`);
            console.log(`🔑 New Password: ${newPassword}`);
        } else {
            console.error(`❌ User ${email} not found!`);
        }
    } catch (err) {
        console.error('❌ Update failed:', err);
    } finally {
        await pool.end();
    }
};

resetAdminPassword();
