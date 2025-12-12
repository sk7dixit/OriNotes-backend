const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const API_URL = 'http://localhost:5000/api';
const EMAIL = 'testupload_' + Date.now() + '@example.com';
const PASSWORD = 'password123';

async function runTest() {
    try {
        console.log(`1. Registering user ${EMAIL}...`);
        await axios.post(`${API_URL}/users/register`, {
            name: 'Test Uploader',
            username: 'testup_' + Date.now(),
            email: EMAIL,
            password: PASSWORD,
            role: 'user'
        });

        // Manually verify (since email verification is mocked or requires token)
        // Actually, in dev environment, maybe verification is skipped or I can use the manual_verify logic?
        // Wait, I can't access DB directly easily from this script without pg.
        // But for login, verification is required (line 134 in userController).
        // I will rely on "manual_verify.js" equivalent logic OR just use a known verified user if I knew one.
        // ALTERNATIVE: Use the "Login" logic to see if it allows unverified? No, it blocks.

        // Let's assume I need to verify.
        // I'll skip registration and try to login with a known user if I can.
        // BUT I DON'T KNOW PASSWORDS.

        // OK, I'll include pg in this script to self-verify.
    } catch (e) {
        console.log("Registration might have failed or user exists:", e.response?.data || e.message);
    }

    // Since I can't easily import 'pg' without setting up connection params (which are in .env),
    // I will try to login. If it says "verify email", I'll be stuck.
    // However, I can try to use a specific test account if the user has one?
    // "shashwatdixit22@gmail.com"

    // BETTER APPROACH:
    // Just try to hit the HEALTH/STATS endpoint first to confirm server is up.
    // If server is up, I'll report success on "Server Fix" and ask user to try.

    // But user said "still not solve".

    // I will try to mimic the upload request using a dummy token if I can't login? No, auth middleware checks DB.

    // I'll try to use the `pg` client to verify the user I just created.
}

// I'll write a script that imports local db config if possible.
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function verifyAndUpload() {
    try {
        // 1. Register
        console.log(`--- Registering ${EMAIL} ---`);
        try {
            await axios.post(`${API_URL}/users/register`, {
                name: 'Test Uploader',
                username: 'testup_' + Date.now(),
                email: EMAIL,
                password: PASSWORD,
                mobileNumber: '1234567890', // Required field
                role: 'user'
            });
        } catch (e) { console.log("Register warn:", e.message); }

        // 2. Verify in DB
        console.log("--- Verifying in DB ---");
        await pool.query("UPDATE users SET is_verified = TRUE WHERE email = $1", [EMAIL]);

        // 3. Login
        console.log("--- Logging In ---");
        const loginRes = await axios.post(`${API_URL}/users/login`, {
            identifier: EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.token;
        console.log("Got Token:", token.substring(0, 20) + "...");

        // 4. Check Stats (Crash detection)
        console.log("--- Checking Stats (Crash Test) ---");
        await axios.get(`${API_URL}/users/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("Stats OK (Server did not crash)");

        // 5. Upload File
        console.log("--- Uploading File ---");
        const form = new FormData();
        const filePath = path.join(__dirname, 'test_note.txt');
        fs.writeFileSync(filePath, "This is a test note for verification.");

        form.append('files', fs.createReadStream(filePath));
        form.append('titles', 'Test Note Title');
        form.append('subjects', 'Test Subject'); // Adjust fields based on controller expectation
        // handleMultiUpload expects: files (array), titles (array), subjects, universities, courses ... (arrays or single?)
        // Let's check handleMultiUpload signature in noteController if failed.
        // Assuming simple fields for now.

        // Actually, just calling the endpoint is enough to test "Connection Refused".
        // Even 400 Bad Request means "Server is UP".

        await axios.post(`${API_URL}/notes/multi-upload`, form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        console.log("Upload Success!");

    } catch (err) {
        console.error("Test Failed:", err.response?.data || err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error("CRITICAL: Server is DOWN (Connection Refused)");
        }
    } finally {
        await pool.end();
        process.exit();
    }
}

verifyAndUpload();
