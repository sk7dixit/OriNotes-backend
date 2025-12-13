
const pool = require('./src/config/db');

async function debug() {
    console.log('Testing Feedback Flow...');

    try {
        // 1. Submit Feedback
        const feedbackData = {
            name: 'Test User',
            email: 'test@example.com',
            message: 'This is a test feedback message.'
        };

        // Simulate usercontroller.submitContactForm insert
        const insertRes = await pool.query(
            `INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3) RETURNING id`,
            [feedbackData.name, feedbackData.email, feedbackData.message]
        );
        console.log(`✅ Feedback submitted. ID: ${insertRes.rows[0].id}`);

        // 2. Admin Retrieve
        // Simulate adminController.getFeedbackMessages
        const adminRes = await pool.query(`
        SELECT * FROM contact_messages 
        ORDER BY created_at DESC 
        LIMIT 5
    `);

        console.log(`--- Admin View (Top 5) ---`);
        if (adminRes.rows.length === 0) {
            console.log("No feedback found (Error?).");
        } else {
            adminRes.rows.forEach(r => {
                console.log(`[${r.id}] ${r.name} (${r.email}): ${r.message} (Read: ${r.is_read})`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

debug();
