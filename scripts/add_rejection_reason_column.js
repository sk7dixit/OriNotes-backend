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
        console.log('--- Migrating: Adding rejection_reason column ---');
        await pool.query(`
      ALTER TABLE notes 
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);
        console.log('✅ Column rejection_reason added (or already exists).');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
