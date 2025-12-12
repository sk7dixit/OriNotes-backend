const { Pool } = require('pg');
require('dotenv').config();
const { updateUserProfile, findUserByEmail } = require('./src/models/userModel');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

// Mock the pool query for the model if needed, or just let the model use the require('../config/db') which might be tricky if paths differ.
// Actually, userModel requires '../config/db'. I should run this from project root so require paths align, OR better yet:
// I will just copy the logic effectively or try to require the model.
// userModel uses `require("../config/db")`. If I run this script from `s:\project\smart-notes-backend`, it should work if I setup `src/config/db` to return my pool or if I rely on the file structure.
// Let's rely on the file structure.

(async () => {
    try {
        // 1. Get a user (e.g. Shashwat or admin)
        const email = 'shashwat@example.com'; // Adjust if needed, or find ANY user
        const res = await pool.query("SELECT * FROM users LIMIT 1");
        const user = res.rows[0];

        if (!user) {
            console.log("No users found.");
            return;
        }
        console.log(`Testing with user: ${user.email} (ID: ${user.id})`);

        // 2. Call updateUserProfile
        const payload = {
            schoolCollege: "Test University " + Date.now(),
            bio: "Test Bio " + Date.now(),
            social_links: { github: "https://github.com/test", linkedin: "" }
        };

        console.log("Updating with payload:", payload);
        const updatedUser = await updateUserProfile(user.id, payload);

        console.log("Updated User Result:", {
            school_college: updatedUser.school_college,
            bio: updatedUser.bio,
            social_links: updatedUser.social_links
        });

        // 3. Verify in DB directly
        const verifyRes = await pool.query("SELECT * FROM users WHERE id = $1", [user.id]);
        const finalUser = verifyRes.rows[0];

        console.log("DB Verification:", {
            school_college: finalUser.school_college,
            bio: finalUser.bio,
            social_links: finalUser.social_links
        });

    } catch (err) {
        console.error("Test Failed:", err);
    } finally {
        pool.end();
        // process.exit(); // hard exit
    }
})();
