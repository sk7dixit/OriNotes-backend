// Need to load dotenv because db config relies on it
require('dotenv').config();
const pool = require('../src/config/db');

async function createChatTable() {
    try {
        const query = `
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                text TEXT NOT NULL,
                username VARCHAR(255) NOT NULL,
                user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;
        await pool.query(query);
        console.log("✅ chat_messages table created or already exists.");
    } catch (err) {
        console.error("❌ Error creating chat table:", err);
    } finally {
        pool.end();
    }
}

createChatTable();
