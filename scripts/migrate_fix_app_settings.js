const pool = require('../src/config/db');

async function migrate() {
    console.log("Starting migration: Fix app_settings column type...");

    try {
        await pool.query(`
            ALTER TABLE app_settings 
            ALTER COLUMN setting_value TYPE TEXT USING setting_value::TEXT;
        `);
        console.log("✅ app_settings.setting_value converted to TEXT.");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        pool.end();
    }
}

migrate();
