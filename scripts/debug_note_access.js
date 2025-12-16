const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function debug() {
    try {
        console.log("🔍 Listing notes to check material_type...");
        const res = await pool.query("SELECT id, title, material_type FROM notes ORDER BY created_at DESC LIMIT 50");

        console.log(`Found ${res.rows.length} notes.`);
        res.rows.forEach(note => {
            console.log(`[${note.id}] "${note.title}" - Type: '${note.material_type}'`);
            if (note.title.includes("SE Short")) {
                console.log("   >>> FOUND TARGET NOTE ^^^");
            }
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

debug();
