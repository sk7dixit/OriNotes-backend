const pool = require('../src/config/db');

async function debug() {
    try {
        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('notifications', 'user_notifications');
    `);
        console.log("Existing tables:", res.rows.map(r => r.table_name));

        if (res.rows.length > 0) {
            const columns = await pool.query(`
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_name IN ('notifications', 'user_notifications')
            ORDER BY table_name, ordinal_position;
        `);
            console.table(columns.rows);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

debug();
