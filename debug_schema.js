const pool = require('./src/config/db');

async function debugSchema() {
    try {
        console.log("--- USERS Table Columns ---");
        const usersRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
        usersRes.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));

        console.log("\n--- NOTES Table Columns ---");
        const notesRes = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notes';
    `);
        notesRes.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));

    } catch (err) {
        console.error("Schema debug error:", err);
    } finally {
        process.exit();
    }
}

debugSchema();
