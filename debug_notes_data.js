const pool = require('./src/config/db');

async function debugNotesData() {
    try {
        console.log("Selecting * from notes for user_id = 3...");
        const res = await pool.query("SELECT * FROM notes WHERE user_id = 3");
        console.log(`Found ${res.rows.length} rows.`);
        res.rows.forEach((row, i) => {
            console.log(`--- Note ${i + 1} ---`);
            console.log(`ID: ${row.id}`);
            console.log(`Title: ${row.title}`);
            console.log(`View Count: ${row.view_count} (Type: ${typeof row.view_count})`);
            console.log(`Is Free: ${row.is_free} (Type: ${typeof row.is_free})`);
            console.log(`Created At: ${row.created_at}`);
        });
    } catch (err) {
        console.error("❌ QUERY FAILED:", err.message);
    } finally {
        process.exit(0);
    }
}

debugNotesData();
