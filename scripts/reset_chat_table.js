require('dotenv').config();
const pool = require('../src/config/db');

async function resetChatTable() {
    try {
        console.log("🔥 Dropping chat_messages table...");
        await pool.query("DROP TABLE IF EXISTS chat_messages");

        console.log("🔨 Creating chat_messages table...");
        const query = `
            CREATE TABLE chat_messages (
                id SERIAL PRIMARY KEY,
                text TEXT NOT NULL,
                username VARCHAR(255) NOT NULL,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;
        await pool.query(query);
        console.log("✅ chat_messages table reset successfully.");
    } catch (err) {
        console.error("❌ Error resetting table:", err);
    } finally {
        pool.end();
    }
}

resetChatTable();
