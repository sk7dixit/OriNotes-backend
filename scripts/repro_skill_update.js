const { Pool } = require('pg');
const { updateUserProfile } = require('../src/models/userModel');
require('dotenv').config();

// Mock pool if necessary or just require the real model which uses the pool
// We will test `updateUserProfile` directly.

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function runTest() {
    try {
        // 1. Get a random user
        const res = await pool.query("SELECT id, username, skills FROM users LIMIT 1");
        if (res.rows.length === 0) {
            console.log("No users found to test.");
            return;
        }
        const user = res.rows[0];
        console.log(`Testing with user: ${user.username} (ID: ${user.id})`);
        console.log("Current skills:", user.skills);

        // 2. Try to update skills
        const newSkills = user.skills ? [...user.skills, "TestSkill_" + Date.now()] : ["TestSkill_" + Date.now()];
        console.log("Attempting to save skills:", newSkills);

        const updatedUser = await updateUserProfile(user.id, { skills: newSkills });
        console.log("✅ Update successful!");
        console.log("New skills:", updatedUser.skills);

    } catch (err) {
        console.error("❌ Update failed:", err);
    } finally {
        await pool.end();
    }
}

runTest();
