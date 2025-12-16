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

async function fixZombieNotes() {
    try {
        console.log("🔍 Searching for 'Zombie' University Notes...");
        // Logic: Real personal notes have 'field' (e.g. Engineering, Class 12).
        // Failed University uploads default to 'personal_material' but have NULL 'field'.
        const query = `
            SELECT id, title, created_at, material_type, field 
            FROM notes 
            WHERE material_type = 'personal_material' 
              AND field IS NULL
            ORDER BY created_at DESC
        `;

        const res = await pool.query(query);

        console.log(`Found ${res.rows.length} potentially misclassified notes.`);

        if (res.rows.length === 0) {
            console.log("No notes to fix.");
            return;
        }

        res.rows.forEach(n => {
            console.log(` - [${n.id}] ${n.title} (Created: ${n.created_at})`);
        });

        const confirm = process.argv.includes('--run');
        if (!confirm) {
            console.log("\n⚠️  Run with --run to execute the update.");
            return;
        }

        console.log("\n🛠️  Fixing notes...");
        const updateQuery = `
            UPDATE notes 
            SET material_type = 'university_material',
                is_free = true
            WHERE material_type = 'personal_material' 
              AND field IS NULL
        `;
        const updateRes = await pool.query(updateQuery);
        console.log(`✅ Updated ${updateRes.rowCount} notes to 'university_material' and is_free=true.`);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        pool.end();
    }
}

fixZombieNotes();
