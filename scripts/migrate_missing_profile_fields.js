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

async function migrate() {
    try {
        console.log('🔄 Starting Extended Profile Fields Migration...');

        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS bio TEXT,
            ADD COLUMN IF NOT EXISTS school_college VARCHAR(255),
            ADD COLUMN IF NOT EXISTS avatar_url TEXT
        `);

        console.log('✅ Successfully added bio, school_college, and avatar_url to users table.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
