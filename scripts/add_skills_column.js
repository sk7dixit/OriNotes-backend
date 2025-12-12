require('dotenv').config();
const pool = require('../src/config/db');

async function addSkillsColumn() {
    try {
        console.log("🔍 Checking/Adding skills column to users table...");

        // Check if column exists
        const check = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users' AND column_name='skills'
        `);

        if (check.rows.length === 0) {
            console.log("➕ Column 'skills' not found. Adding it...");
            await pool.query("ALTER TABLE users ADD COLUMN skills TEXT[] DEFAULT '{}'");
            console.log("✅ Column added successfully.");
        } else {
            console.log("ℹ️ Column 'skills' already exists.");
        }

    } catch (err) {
        console.error("❌ Error altering table:", err);
    } finally {
        pool.end();
    }
}

addSkillsColumn();
