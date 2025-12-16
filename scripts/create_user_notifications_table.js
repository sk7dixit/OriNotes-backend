const pool = require('../src/config/db');

async function migrate() {
    console.log("Starting migration: Create user_notifications table...");

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, notification_id)
            );
        `);
        console.log("✅ user_notifications table created (or already exists).");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        pool.end();
    }
}

migrate();
