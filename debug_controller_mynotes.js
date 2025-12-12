const noteController = require('./src/controllers/noteController');
const pool = require('./src/config/db');

// Mock req and res
const req = {
    user: { id: 3, username: 'shashwat', role: 'user' }, // Using ID 3 as found in DB
    params: {},
    body: {}
};

const res = {
    json: (data) => {
        console.log("✅ Controller responded with JSON:");
        if (data.notes) {
            console.log(`Notes count: ${data.notes.length}`);
            console.log(`Stats:`, data.stats);
        } else {
            console.log(data);
        }
    },
    status: (code) => {
        console.log(`⚠️ Controller set status: ${code}`);
        return {
            json: (data) => console.log("Error JSON:", data)
        };
    }
};

async function testController() {
    try {
        console.log("Calling getMyNotes with mocked user ID 3...");
        await noteController.getMyNotes(req, res);
    } catch (err) {
        console.error("❌ Test crashed:", err);
    } finally {
        // pool.end() might keep script alive if not careful, but required
    }
}

testController();
