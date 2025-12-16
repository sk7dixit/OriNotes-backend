const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const API_URL = (process.env.FRONTEND_URL || 'http://localhost:5000').replace(/\/$/, '') + '/api';

async function runTest() {
    try {
        console.log("Authentication...");
        const email = process.env.ADMIN_EMAIL || 'admin@example.com';
        const password = process.env.ADMIN_PASSWORD || 'password';

        // 1. Login
        let token = null;
        try {
            const loginRes = await axios.post(`${API_URL}/users/login`, {
                identifier: email,
                password: password
            });
            token = loginRes.data.token;
            console.log("✅ Login successful. Token obtained.");
        } catch (e) {
            console.error("Login failed:", e.response ? e.response.data : e.message);
            return;
        }

        // 2. Update Profile
        console.log("Updating profile skills...");
        try {
            const updateRes = await axios.put(
                `${API_URL}/users/profile`,
                { skills: ['Javascript', 'NodeJS', 'TestSkill'] },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log("✅ Profile API update successful!");
            console.log("Response data:", updateRes.data);
        } catch (e) {
            console.error("❌ Profile API update failed:", e.response ? e.response.data : e.message);
        }

    } catch (err) {
        console.error("Unexpected error:", err);
    }
}

runTest();
