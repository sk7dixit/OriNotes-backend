
const pool = require('./src/config/db');

async function debug() {
    const email = 'shashwatdixit33@gmail.com';
    console.log(`Sending test notification to: ${email}`);

    try {
        const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
        if (userRes.rows.length === 0) {
            console.log('❌ User NOT found.');
            return;
        }
        const userId = userRes.rows[0].id;

        // 1. Insert Notification (targeted)
        const title = 'Test Notification';
        const message = 'This is a test notification verifying the system is working.';
        const insertRes = await pool.query(
            `INSERT INTO notifications (title, message, recipient_id, type)
       VALUES ($1, $2, $3, 'system') RETURNING id`,
            [title, message, userId]
        );
        const notificationId = insertRes.rows[0].id;
        console.log(`✅ Notification created (ID: ${notificationId})`);

        // 2. Fetch Notifications logic simulation
        const fetchQuery = `
      SELECT
        n.id, n.title, n.message, n.created_at, n.type, un.is_read
      FROM notifications n
      LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = $1
      WHERE n.recipient_id IS NULL OR n.recipient_id = $1
      ORDER BY n.created_at DESC LIMIT 5
    `;
        const fetchRes = await pool.query(fetchQuery, [userId]);
        console.log('--- Fetched Notifications (User Perspective) ---');
        console.log(fetchRes.rows);

        // 3. Unread Count logic simulation
        const countQuery = `
      SELECT COUNT(n.id)
      FROM notifications n
      LEFT JOIN user_notifications un ON n.id = un.notification_id AND un.user_id = $1
      WHERE (n.recipient_id IS NULL OR n.recipient_id = $1)
      AND un.is_read IS NOT TRUE
    `;
        const countRes = await pool.query(countQuery, [userId]);
        console.log(`\nUnread Count for User ${userId}: ${countRes.rows[0].count}`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

debug();
