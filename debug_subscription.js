const pool = require('./src/config/db');

async function debugSettings() {
    try {
        console.log("Reading current setting...");
        const res1 = await pool.query("SELECT * FROM app_settings WHERE setting_key = 'is_subscription_enabled'");
        console.log("Current Value:", res1.rows[0]);

        console.log("Updating to 'false' (string)...");
        await pool.query("UPDATE app_settings SET setting_value = 'false' WHERE setting_key = 'is_subscription_enabled'");

        console.log("Reading again...");
        const res2 = await pool.query("SELECT * FROM app_settings WHERE setting_key = 'is_subscription_enabled'");
        console.log("New Value:", res2.rows[0]);

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

debugSettings();
