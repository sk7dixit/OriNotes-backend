
const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('Running migration: Adding social IDs to users table...');

        // Add google_id column if not exists
        await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='google_id') THEN
          ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
        END IF;
      END
      $$;
    `);

        // Add github_id column if not exists
        await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='github_id') THEN
          ALTER TABLE users ADD COLUMN github_id VARCHAR(255) UNIQUE;
        END IF;
      END
      $$;
    `);

        // Add avatar_url column if not exists (often useful for social login)
        await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN
          ALTER TABLE users ADD COLUMN avatar_url TEXT;
        END IF;
      END
      $$;
    `);

        console.log('✅ Migration successful.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
