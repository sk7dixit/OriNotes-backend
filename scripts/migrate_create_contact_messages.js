
const pool = require('../src/config/db');

async function migrate() {
    console.log("Starting migration: Create contact_messages table...");

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS contact_messages (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                name VARCHAR(100),
                email VARCHAR(150),
                message TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'new',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log("✅ contact_messages table created (if not exists).");

        // Add indexes if needed
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);`);

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        pool.end();
    }
}

migrate();
