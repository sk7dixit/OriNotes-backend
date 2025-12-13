const pool = require('../src/config/db.js');

const checkTables = async () => {
    console.log('🔍 Checking database tables...');
    try {
        const res = await pool.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
        );
        console.log('Tables found:', res.rows.length);
        res.rows.forEach(r => console.log(' - ' + r.table_name));

        if (res.rows.length === 0) {
            console.log('⚠️ Database is empty.');
        } else {
            console.log('✅ Database content listed above.');
        }
    } catch (err) {
        console.error('❌ Check failed:', err);
    } finally {
        await pool.end();
    }
};

checkTables();
