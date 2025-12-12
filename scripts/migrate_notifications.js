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

async function migrateNotifications() {
    try {
        console.log('🔌 Connecting to database...');

        // Add columns if they don't exist
        const queries = [
            `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE;`,
            `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';`,
            `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id INTEGER;`,
            `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_url TEXT;`
        ];

        for (const query of queries) {
            await pool.query(query);
            console.log(`✅ Executed: ${query}`);
        }

        console.log('🎉 Notification table migration completed successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrateNotifications();
