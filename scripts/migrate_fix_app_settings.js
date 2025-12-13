
const pool = require('../src/config/db');

async function migrate() {
    console.log("Starting migration: Fix app_settings value type...");

    try {
        // Change column type from BOOLEAN to TEXT
        // We use 'USING setting_value::text' to convert existing boolean true/false to string "true"/"false"
        await pool.query(`
            ALTER TABLE app_settings 
            ALTER COLUMN setting_value TYPE TEXT USING setting_value::text;
        `);

        // Also ensure default is removed or updated if it was boolean dependent (it was DEFAULT true)
        // Let's set default to 'true' as string if we want to keep it, or just drop default.
        // The schema had DEFAULT true. Let's make it DEFAULT 'false' or just drop it.
        // Actually, let's just set the default to 'false' string to match likely boolean usage until explicitly set.
        await pool.query(`
            ALTER TABLE app_settings 
            ALTER COLUMN setting_value SET DEFAULT 'false';
        `);

        console.log("✅ app_settings table updated: setting_value is now TEXT.");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        pool.end();
    }
}

migrate();
