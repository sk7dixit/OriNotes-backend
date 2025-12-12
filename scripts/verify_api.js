const http = require('http');

function request(options, data) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });
        req.on('error', reject);
        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function verifyApi() {
    try {
        console.log('🔑 Logging in...');
        const loginRes = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/users/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, {
            identifier: 'shashwatdixit22@gmail.com',
            password: 'Abc@1234'
        });

        if (loginRes.status !== 200) {
            console.error('❌ Login failed:', loginRes.body);
            return;
        }

        const token = loginRes.body.token; // Access token (might be in 'token' or 'accessToken')
        console.log('✅ Login successful. Token obtained.');

        console.log('🔔 Fetching Notifications...');
        const notifRes = await request({
            hostname: 'localhost',
            port: 5000,
            path: '/api/notifications',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log(`Response Status: ${notifRes.status}`);
        console.log(`Notifications Count: ${notifRes?.body?.notifications?.length}`);

        if (notifRes.body && notifRes.body.notifications) {
            notifRes.body.notifications.forEach(n => {
                console.log(` - [${n.type}] ${n.title} (ID: ${n.id})`);
            });
        } else {
            console.log('Body:', notifRes.body);
        }

    } catch (err) {
        console.error('❌ Script error:', err);
    }
}

verifyApi();
