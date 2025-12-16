const pool = require('../src/config/db');
require('dotenv').config();

async function migrate() {
    try {
        console.log('🔌 Connecting to database...');
        // Pool.query matches the shared config interface usually
        const client = pool;

        console.log('🛠️ Creating contact_messages table...');
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS contact_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        status VARCHAR(50) DEFAULT 'new',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

        await client.query(createTableQuery);
        console.log('✅ contact_messages table created successfully.');

        // Verify it exists
        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'contact_messages'
    `);

        if (res.rows.length > 0) {
            console.log('✅ Verification: Table exists.');
        } else {
            console.error('❌ Verification: Table NOT found after creation attempt.');
        }

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
