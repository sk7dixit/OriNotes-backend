const pool = require('../config/db');

async function migrate() {
    try {
        console.log('Starting migration: Adding state column to notes table...');

        // Add state column safely
        await pool.query(`
      ALTER TABLE notes 
      ADD COLUMN IF NOT EXISTS state VARCHAR(100);
    `);

        // Add index for performance
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_notes_state ON notes(state);
    `);

        console.log('✅ Migration successful: state column added.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
