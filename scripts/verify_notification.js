const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function verifyNotification() {
    const userId = 42; // s18_dixit

    try {
        console.log(`🔌 Connecting to DB... Testing for User ID: ${userId}`);

        // Clean up previous test notifications
        await pool.query("DELETE FROM notifications WHERE title LIKE 'TEST_NOTIFICATION_%'");

        // 1. Manually Create Targeted Notification
        const title = `TEST_NOTIFICATION_${Date.now()}`;
        const result = await pool.query(
            `INSERT INTO notifications (title, message, recipient_id, type, reference_url) 
       VALUES ($1, 'This is a test', $2, 'rating', '/test-url') RETURNING id`,
            [title, userId]
        );
        const notificationId = result.rows[0].id;
        console.log(`✅ Created Notification ID: ${notificationId} (Targeted to ${userId})`);

        // 2. Simulate User Notification Fetch (mimic controller logic)
        const fetchQuery = `
      SELECT
        n.id, n.title, n.message, n.type, n.reference_url,
        un.is_read
      FROM notifications n
      LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = $1
      WHERE n.recipient_id IS NULL OR n.recipient_id = $1
      ORDER BY n.created_at DESC
    `;
        const fetchResult = await pool.query(fetchQuery, [userId]);

        // 3. Verify
        const found = fetchResult.rows.find(n => n.id === notificationId);
        if (found) {
            console.log(`🎉 SUCCESS: Found targeted notification!`);
            console.log(`   Title: ${found.title}`);
            console.log(`   Type: ${found.type} (Expected: rating)`);
            console.log(`   URL: ${found.reference_url}`);
        } else {
            console.error(`❌ FAILED: Notification not found in use fetch query.`);
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

verifyNotification();
