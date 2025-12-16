const pool = require('../src/config/db');

async function debug() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'app_settings';
    `);
        console.log("Columns in 'app_settings' table:");
        console.table(res.rows);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

debug();
