const pool = require('./src/config/db');

async function checkUserNotes() {
    try {
        const email = 'shashwatdixit22@gmail.com';
        console.log(`Checking data for user: ${email}`);

        // Get User ID
        const userRes = await pool.query("SELECT id, name, email FROM users WHERE email = $1", [email]);

        if (userRes.rows.length === 0) {
            console.log("❌ User not found in database!");
            return;
        }

        const user = userRes.rows[0];
        console.log(`✅ User Found: ID=${user.id}, Name=${user.name}`);

        // Check Notes
        const notesRes = await pool.query("SELECT id, title, approval_status, created_at FROM notes WHERE user_id = $1", [user.id]);

        console.log(`\n📊 Note Count: ${notesRes.rows.length}`);
        if (notesRes.rows.length > 0) {
            console.table(notesRes.rows);
        } else {
            console.log("⚠️ No notes found for this user.");
        }

        // Check overall notes table count to ensure table isn't empty
        const totalNotes = await pool.query("SELECT COUNT(*) FROM notes");
        console.log(`\nTotal notes in system: ${totalNotes.rows[0].count}`);

    } catch (err) {
        console.error("❌ DB Error:", err);
    } finally {
        process.exit(0);
    }
}

checkUserNotes();
