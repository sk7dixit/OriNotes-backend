
const pool = require('../config/db');

/**
 * Auto Approve Service
 * Periodically checks for pending notes that are older than 10 minutes.
 * If 'auto_approval' setting is enabled (true), it approves them automatically.
 */

async function runAutoApprovalCheck() {
    try {
        // 1. Check if auto_approval is enabled
        const settingRes = await pool.query("SELECT setting_value FROM app_settings WHERE setting_key = 'auto_approval'");
        // Handle TEXT 'true'/'false' or boolean mismatch safely
        const rawValue = settingRes.rows[0]?.setting_value;
        const isAutoApproveEnabled = rawValue === 'true' || rawValue === true; // Handle both TEXT and BOOLEAN types for safety

        if (!isAutoApproveEnabled) {
            // console.log("[AutoApprove] Feature disabled. Skipping check.");
            return;
        }

        // 2. Find and update notes
        // Condition: Status is pending AND created_at < NOW() - 10 minutes
        // We update them to 'approved' and return their IDs for logging
        const result = await pool.query(`
            UPDATE notes 
            SET approval_status = 'approved', updated_at = NOW() 
            WHERE approval_status = 'pending' 
              AND created_at < (NOW() - INTERVAL '10 minutes')
            RETURNING id, title;
        `);

        if (result.rowCount > 0) {
            console.log(`[AutoApprove] ✅ Automatically approved ${result.rowCount} notes:`);
            result.rows.forEach(note => console.log(` - ID ${note.id}: ${note.title}`));
        } else {
            // console.log("[AutoApprove] No pending notes eligible for auto-approval.");
        }

    } catch (err) {
        console.error("[AutoApprove] ❌ Error checking for auto-approvals:", err.message);
    }
}

function initAutoApprove() {
    console.log("⏱️  Auto-Approve Scheduler initialized (Interval: 60s)");
    // Run immediately on start
    runAutoApprovalCheck();
    // Then every 60 seconds
    setInterval(runAutoApprovalCheck, 60 * 1000);
}

module.exports = { initAutoApprove };
