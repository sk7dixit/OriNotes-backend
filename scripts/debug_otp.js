const pool = require('../src/config/db.js');
const { findUserByEmailOrUsername } = require('../src/models/userModel.js');

const debugOtp = async () => {
    console.log('🔍 Debugging OTP Flow...');
    const identifier = 'learnify887@gmail.com';

    try {
        console.log(`1. Finding user: ${identifier}`);
        const user = await findUserByEmailOrUsername(identifier);

        if (!user) {
            console.error('❌ User NOT found.');
            return;
        }
        console.log('✅ User found:', user.email, `(Verified: ${user.is_verified})`);

        if (!user.is_verified) {
            console.log('⚠️ User is not verified. This would cause a 403 error, not 500.');
        }

        const otp = '123456';
        console.log('2. Inserting OTP into DB...');
        await pool.query(
            `INSERT INTO otps (email, otp) VALUES ($1, $2)
             ON CONFLICT (email) DO UPDATE SET otp = $2, created_at = NOW()`,
            [user.email, otp]
        );
        console.log('✅ OTP Inserted successfully.');

        console.log('3. Simulating Email Send (Skipping actual send, checking DB side only)');
        // If we got here, DB operations are fine.

    } catch (err) {
        console.error('❌ OTP Flow CRASHED:', err);
    } finally {
        await pool.end();
    }
};

debugOtp();
