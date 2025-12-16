try {
    const noteController = require('../src/controllers/noteController');
    console.log('Controller loaded successfully.');
    console.log('Keys:', Object.keys(noteController));

    // Check specific keys
    if (!noteController.getFilteredNotes) console.error('getFilteredNotes MISSING');
    if (!noteController.getMyNotes) console.error('getMyNotes MISSING');

} catch (e) {
    console.error('CRITICAL IMPORT ERROR:');
    console.error(e.name);
    console.error(e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1);
}
