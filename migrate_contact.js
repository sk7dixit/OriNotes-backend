const pool = require('./src/config/db');

async function createContactTable() {
    try {
        console.log("Creating contact_messages table...");
        await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'new', -- new, read, replied
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log("✅ contact_messages table created successfully.");
    } catch (err) {
        console.error("❌ Error creating table:", err);
    } finally {
        process.exit();
    }
}

createContactTable();
