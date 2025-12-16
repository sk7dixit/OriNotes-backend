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
        const res = await pool.query("SELECT id, title, material_type, pdf_path, file_url, cloudinary_public_id FROM notes ORDER BY created_at DESC LIMIT 50");
        console.log(`Found ${res.rows.length} notes.`);

        res.rows.forEach(note => {
            const hasCloud = !!(note.file_url || note.cloudinary_public_id);
            const hasLocal = !!note.pdf_path;

            console.log(`[${note.id}] ${note.title}`);
            console.log(`   - Cloud: ${hasCloud} (${note.file_url})`);
            console.log(`   - Local: ${hasLocal} (${note.pdf_path})`);

            if (!hasCloud && !hasLocal) {
                console.error(`   ⚠️ CRITICAL: Both paths are null! This will crash the viewer.`);
            }
        });
    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

debug();
