const pool = require('../src/config/db');

async function createNoteReportsTable() {
    try {
        console.log("Creating note_reports table...");
        await pool.query(`
            CREATE TABLE IF NOT EXISTS note_reports (
                id SERIAL PRIMARY KEY,
                note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
                reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                reason TEXT NOT NULL,
                comment TEXT,
                status VARCHAR(20) DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ note_reports table created successfully.");
    } catch (err) {
        console.error("❌ Error creating note_reports table:", err);
    } finally {
        pool.end();
    }
}

createNoteReportsTable();
