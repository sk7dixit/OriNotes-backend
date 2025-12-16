const pool = require('../src/config/db');

async function debug() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notes';
    `);
        console.log("Columns in 'notes' table:");
        console.table(res.rows);
    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

debug();
