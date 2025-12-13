const pool = require('../src/config/db.js');

const deployFix = async () => {
    console.log('🔧 Starting Database Fix Script...');

    try {
        // 1. Fix: pending_registrations
        console.log('Checking pending_registrations table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.pending_registrations (
                id BIGSERIAL PRIMARY KEY,
                name character varying(100) NOT NULL,
                email character varying(150) UNIQUE NOT NULL,
                password character varying(255) NOT NULL,
                username character varying(50) NOT NULL,
                mobile_number character varying(255),
                role character varying(20) DEFAULT 'user'::character varying,
                otp character varying(6) NOT NULL,
                otp_created_at TIMESTAMPTZ DEFAULT NOW(),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
            );
        `);
        // Add index separately to avoid errors if it exists
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON public.pending_registrations(email);`);
        console.log('✅ pending_registrations table checked/created.');

        // 2. Fix: refresh_tokens
        console.log('Checking refresh_tokens table...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.refresh_tokens (
                id BIGSERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
                token TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                expires_at TIMESTAMPTZ NOT NULL,
                user_agent TEXT,
                ip_address TEXT,
                revoked BOOLEAN DEFAULT FALSE
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON public.refresh_tokens(user_id);`);
        console.log('✅ refresh_tokens table checked/created.');

        // 3. Fix: notes table 'state' column
        console.log('Checking notes table for state column...');
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='notes' AND column_name='state';
        `);

        if (res.rowCount === 0) {
            console.log('⚠️ Column "state" missing in "notes". Adding it...');
            await pool.query(`ALTER TABLE public.notes ADD COLUMN state character varying(100);`);
            // Update any existing university material rows to have a default state if possible? 
            // Possibly not needed, null is fine.
            console.log('✅ Column "state" added to "notes" table.');
        } else {
            console.log('✅ Column "state" already exists.');
        }

        console.log('🎉 Database Fix Complete. You should now be able to Register and Browse notes without 500 errors.');

    } catch (error) {
        console.error('❌ Fix Script Failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
};

deployFix();
