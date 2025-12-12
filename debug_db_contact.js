const pool = require('./src/config/db');

async function testDB() {
    try {
        console.log("Checking database connection...");
        const client = await pool.connect();
        console.log("✅ Connected to database.");
        client.release();

        console.log("Checking if 'contact_messages' table exists...");
        const tableCheck = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'contact_messages'
        `);

        if (tableCheck.rows.length === 0) {
            console.error("❌ Table 'contact_messages' DOES NOT EXIST!");
        } else {
            console.log("✅ Table 'contact_messages' exists.");

            console.log("Checking table columns...");
            const columnsCheck = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'contact_messages'
            `);
            columnsCheck.rows.forEach(col => console.log(`   - ${col.column_name} (${col.data_type})`));
        }

        console.log("Attempting to insert a test message...");
        const insertRes = await pool.query(`
            INSERT INTO contact_messages (name, email, message) 
            VALUES ('Debug User', 'debug@test.com', 'This is a test message from debug script.')
            RETURNING *
        `);
        console.log("✅ Insert successful! inserted row:", insertRes.rows[0]);

        console.log("Attempting to read back messages...");
        const readRes = await pool.query("SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 1");
        console.log("✅ Read successful! Last message:", readRes.rows[0]);

    } catch (err) {
        console.error("❌ Database Error:", err);
    } finally {
        // Close pool to allow script to exit
        // pool.end() might hang if active connections, but let's try
        process.exit(0);
    }
}

testDB();
