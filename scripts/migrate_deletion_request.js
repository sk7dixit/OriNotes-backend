
const pool = require('../src/config/db');

async function migrate() {
    console.log("Starting migration: Add deletion_requested to notes table...");

    try {
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='deletion_requested') THEN 
                    ALTER TABLE notes ADD COLUMN deletion_requested BOOLEAN DEFAULT FALSE; 
                    RAISE NOTICE 'Added deletion_requested column';
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='deletion_reason') THEN 
                    ALTER TABLE notes ADD COLUMN deletion_reason TEXT; 
                    RAISE NOTICE 'Added deletion_reason column';
                END IF;
            END $$;
        `);
        console.log("✅ Migration completed: deletion_requested and deletion_reason columns added.");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        pool.end();
    }
}

migrate();
