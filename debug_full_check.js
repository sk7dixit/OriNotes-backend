const pool = require('./src/config/db');

async function debugFull() {
    try {
        console.log("--- User Check ---");
        const email = 'shashwatdixit22@gmail.com';
        const userRes = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
        if (userRes.rows.length === 0) {
            console.log("❌ User not found!");
        } else {
            const u = userRes.rows[0];
            console.log(`User Found: ID=${u.id} (Type: ${typeof u.id}), Username=${u.username}`);
        }

        console.log("\n--- All Notes Check ---");
        const notesRes = await pool.query("SELECT id, user_id, title FROM notes");
        console.log(`Total Notes: ${notesRes.rows.length}`);
        notesRes.rows.forEach(n => {
            console.log(`Note ID: ${n.id}, User ID: ${n.user_id} (Type: ${typeof n.user_id}), Title: ${n.title}`);
        });

    } catch (err) {
        console.error("❌ DB Error:", err);
    } finally {
        process.exit(0);
    }
}

debugFull();
