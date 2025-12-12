const { searchGlobal } = require('./src/controllers/adminController');
const userController = require('./src/controllers/userController');
console.log('User Controller Exports:', Object.keys(userController));
const { searchUsers } = userController;

// Mock Req/Res
const mockRes = () => {
    return {
        json: (data) => console.log('JSON Response:', JSON.stringify(data, null, 2)),
        status: (code) => {
            console.log('Status:', code);
            return { json: (data) => console.log('JSON Error:', data) };
        }
    };
};

(async () => {
    try {
        console.log("--- Testing User Controller Search (Frontend) ---");
        const req1 = { query: { q: 's18_dixit' }, user: { id: 1 } }; // Simulate auth user
        await searchUsers(req1, mockRes());

        console.log("\n--- Testing Admin Controller Search (Dashboard) ---");
        const req2 = { query: { q: 's18_dixit' } };
        await searchGlobal(req2, mockRes());

    } catch (err) {
        console.error("Test Failed:", err);
    } finally {
        process.exit(0); // Force exit as pool might hang
    }
})();
