
const pool = require('../src/config/db');

async function migrate() {
    console.log("Starting migration: Add missing profile columns to users table...");

    try {
        // 1. Add 'branch' column
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='branch') THEN 
                    ALTER TABLE users ADD COLUMN branch VARCHAR(100); 
                    RAISE NOTICE 'Added branch column';
                END IF;
            END $$;
        `);

        // 2. Add 'semester' column
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='semester') THEN 
                    ALTER TABLE users ADD COLUMN semester VARCHAR(50); 
                    RAISE NOTICE 'Added semester column';
                END IF;
            END $$;
        `);

        // 3. Add 'gender' column
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='gender') THEN 
                    ALTER TABLE users ADD COLUMN gender VARCHAR(20); 
                    RAISE NOTICE 'Added gender column';
                END IF;
            END $$;
        `);

        // 4. Add 'social_links' column (JSONB)
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='social_links') THEN 
                    ALTER TABLE users ADD COLUMN social_links JSONB DEFAULT '{}'::jsonb; 
                    RAISE NOTICE 'Added social_links column';
                END IF;
            END $$;
        `);

        // 5. Add 'skills' column (TEXT Array) - just in case it's missing too
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='skills') THEN 
                    ALTER TABLE users ADD COLUMN skills TEXT[] DEFAULT ARRAY[]::TEXT[]; 
                    RAISE NOTICE 'Added skills column';
                END IF;
            END $$;
        `);

        // 6. Add 'avatar_url' column - just in case it's missing (though social login migration might have added it)
        await pool.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN 
                    ALTER TABLE users ADD COLUMN avatar_url TEXT; 
                    RAISE NOTICE 'Added avatar_url column';
                END IF;
            END $$;
        `);


        console.log("✅ Migration completed successfully.");

    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        pool.end();
    }
}

migrate();
