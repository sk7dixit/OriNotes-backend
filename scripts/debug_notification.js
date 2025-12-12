const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function simulateNotification() {
    const client = await pool.connect();
    try {
        const recipientId = 40; // Admin (learnify887) - The one who requested
        const title = "Test Notification";
        const message = "This is a test notification from debug script.";
        const type = "general";
        const refId = 13; // Note ID
        const refUrl = "/notes/view/13";

        console.log(`Sending notification to User ${recipientId}...`);

        const query = `
      INSERT INTO notifications (title, message, recipient_id, type, reference_id, reference_url) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
    `;

        const res = await client.query(query, [title, message, recipientId, type, refId, refUrl]);
        console.log("✅ Notification Sent:", res.rows[0]);

    } catch (err) {
        console.error("❌ Notification Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

simulateNotification();
