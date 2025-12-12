const pool = require('./src/config/db');

async function checkNoteColumns() {
    try {
        console.log("Checking columns in 'notes' table...");
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'notes'
        `);

        const dbColumns = res.rows.map(r => r.column_name);
        console.log("DB Columns:", dbColumns.join(', '));

        const requiredCols = [
            'id', 'title', 'subject', 'created_at', 'approval_status', 'view_count',
            'file_url', 'pdf_path', 'rejection_reason',
            'university_name', 'course', 'field', 'material_type', 'state', 'is_free'
        ];

        const missing = requiredCols.filter(c => !dbColumns.includes(c));
        if (missing.length > 0) {
            console.error("❌ MISSING COLUMNS:", missing);
        } else {
            console.log("✅ All required columns exist.");
        }

    } catch (err) {
        console.error("DB Error:", err);
    } finally {
        process.exit(0);
    }
}

checkNoteColumns();
