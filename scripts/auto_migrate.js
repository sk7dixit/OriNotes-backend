const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db.js');

const autoMigrate = async () => {
    console.log('🔄 Checking database state...');

    try {
        // Check if critical table 'users' exists
        const checkRes = await pool.query("SELECT to_regclass('public.users') as table_exists");

        if (checkRes.rows[0].table_exists) {
            console.log('✅ Database already initialized (Table "users" found). Skipping migration.');
            return; // Exit function, allowing script to finish and next command to run
        }

        console.log('⚠️  Database seems empty. Running initial schema migration...');

        // Read schema.sql
        const schemaPath = path.join(__dirname, '..', 'src', 'schema.sql'); // Corrected path to src/schema.sql? Check file location previously seen.
        // Wait, previously I saw it at s:\project\smart-notes-backend\schema.sql (root) or src?
        // Let's assume root based on previous view_file. 
        // Wait, step 76 view_file was s:\project\smart-notes-backend\schema.sql
        // But migrate.js (step 97) had: path.join(__dirname, '..', 'schema.sql')
        // That implies scripts/../schema.sql -> root/schema.sql. OK.

        const rootSchemaPath = path.join(__dirname, '..', 'schema.sql');

        if (!fs.existsSync(rootSchemaPath)) {
            throw new Error(`Schema file not found at ${rootSchemaPath}`);
        }

        const schemaSql = fs.readFileSync(rootSchemaPath, 'utf8');

        // Run the schema
        console.log('Executing schema.sql...');
        await pool.query(schemaSql);
        console.log('✅ Database initialized successfully.');

    } catch (error) {
        console.error('❌ Auto-migration failed:', error);
        // We do NOT exit(1) because maybe it was a connection glitch, 
        // but better to let the app try to start or fail naturally?
        // Actually, if migration fails, app will likely fail.
        process.exit(1);
    } finally {
        // Only close pool if we are running as a standalone script.
        // But since this is "node script && node server", we MUST close this pool instance 
        // so the process finishes and '&&' continues to the next command.
        await pool.end();
    }
};

autoMigrate();
