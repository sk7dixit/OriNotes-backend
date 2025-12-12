const pool = require('./src/config/db');

async function debugTables() {
    try {
        console.log("--- ALL TABLES ---");
        const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        res.rows.forEach(r => console.log(r.table_name));

    } catch (err) {
        console.error("Schema debug error:", err);
    } finally {
        process.exit();
    }
}

debugTables();
