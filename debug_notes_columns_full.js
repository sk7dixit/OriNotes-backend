const pool = require('./src/config/db');

async function listColumns() {
    try {
        console.log("Listing columns for 'notes' table:");
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'notes'
        `);

        const cols = res.rows.map(r => r.column_name).sort();
        cols.forEach(c => console.log(c));

    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        process.exit(0);
    }
}

listColumns();
