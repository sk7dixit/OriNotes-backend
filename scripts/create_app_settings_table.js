const pool = require('../src/config/db');

async function createAppSettingsTable() {
    try {
        console.log("Creating app_settings table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ app_settings table created successfully.");

        // precise seed data for email settings if they don't exist
        const seedSettings = [
            { key: 'smtp_host', value: 'smtp.example.com' },
            { key: 'smtp_port', value: '587' },
            { key: 'enable_system_emails', value: 'false' }
            // Intentionally excluding sensitive auth defaults, user can add those
        ];

        for (const setting of seedSettings) {
            await pool.query(`
                INSERT INTO app_settings (setting_key, setting_value)
                VALUES ($1, $2)
                ON CONFLICT (setting_key) DO NOTHING;
            `, [setting.key, setting.value]);
        }
        console.log("✅ Default email settings seeded.");

    } catch (err) {
        console.error("❌ Error creating app_settings table:", err);
    } finally {
        pool.end();
    }
}

createAppSettingsTable();
