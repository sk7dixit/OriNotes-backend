require('dotenv').config();
const pool = require('./src/config/db');

async function checkChatDB() {
    try {
        console.log("🔍 Checking chat_messages table...");
        const res = await pool.query("SELECT COUNT(*) FROM chat_messages");
        console.log(`✅ Table exists! Row count: ${res.rows[0].count}`);

        console.log("📝 Inserting test message...");
        const ins = await pool.query(
            "INSERT INTO chat_messages (text, username, user_id) VALUES ($1, $2, $3) RETURNING id",
            ['Test Message from Script', 'script_bot', null] // allowing null userid if schema permits, otherwise fetch a user
        );
        console.log(`✅ Inserted message ID: ${ins.rows[0].id}`);

    } catch (err) {
        console.error("❌ Database Error:", err);
    } finally {
        pool.end();
    }
}

checkChatDB();
