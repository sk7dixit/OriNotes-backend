const axios = require('axios');

async function testBackend() {
    try {
        // 1. Login
        console.log("Logging in...");
        const loginRes = await axios.post('http://localhost:5000/api/users/login', {
            identifier: 'shashwatdixit22@gmail.com',
            password: 'Abc@1234'
        });

        const token = loginRes.data.token;
        console.log("Login successful. Token obtained.");

        // 2. Get Shared Notes
        console.log("Fetching shared notes...");
        const sharedRes = await axios.get('http://localhost:5000/api/notes/shared-with-me', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("Shared Notes Response Status:", sharedRes.status);
        console.log("Shared Notes Data:", JSON.stringify(sharedRes.data, null, 2));

    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

testBackend();
