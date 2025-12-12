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
        console.log('🔄 Starting Profile Fields Migration...');

        // Add columns if they don't exist
        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS gender VARCHAR(50),
      ADD COLUMN IF NOT EXISTS branch VARCHAR(100),
      ADD COLUMN IF NOT EXISTS semester VARCHAR(50);
    `);

        console.log('✅ Successfully added social_links, gender, branch, and semester to users table.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
