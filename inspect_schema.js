require('dotenv').config();
const pool = require('./src/config/db');

async function inspectSchema() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'chat_messages'
        `);
        console.log("Existing Columns:", res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

inspectSchema();
