const pool = require('../src/config/db');

async function createNoteRatingsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS note_ratings (
                id SERIAL PRIMARY KEY,
                note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                review_text TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(note_id, user_id)
            );
        `);
        console.log("✅ 'note_ratings' table verified/created.");
    } catch (err) {
        console.error("❌ Error creating 'note_ratings' table:", err);
    } finally {
        pool.end();
    }
}

createNoteRatingsTable();
