// src/controllers/adminController.js
const pool = require('../config/db');
const { allBadges } = require('../utils/badgeService');

// --- Your existing controller functions ---

async function getDashboardData(req, res) {
    try {
        const { range } = req.query;
        let dateFilter = '';
        const params = [];

        // Determine date filter
        if (range === 'today') {
            dateFilter = "AND created_at >= CURRENT_DATE";
        } else if (range === '7d') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '7 days'";
        } else if (range === '30d') {
            dateFilter = "AND created_at >= NOW() - INTERVAL '30 days'";
        }
        // 'all' or undefined means no filter

        const [
            usersResult,
            activeSubscriptionsResult,
            totalRevenueResult,
            popularNotesResult,
            totalViewsResult,
            allSubscriptionsResult,
            planDistributionResult,
            pendingReportsResult,
            activeNotesResult,
            pendingNotesResult // Added variable
        ] = await Promise.all([
            // Total Users (Created in range)
            pool.query(`SELECT COUNT(*) FROM users WHERE role = 'user' ${dateFilter}`),

            // Active Subscriptions (Always current active, ignoring range for validity, but could filter by start_date if needed. Keeping as total active for now as per dash semantics usually)
            pool.query("SELECT COUNT(*) FROM subscriptions WHERE end_date > NOW() AND status = 'active'"),

            // Total Revenue (All time or in range? Usually DASH means performance in range. Let's apply range to payment date/subscription start)
            // Assuming we want Total Revenue generated IN THIS PERIOD
            pool.query(`
                SELECT COALESCE(SUM(
                    CASE plan
                        WHEN 'weekly' THEN 5
                        WHEN 'monthly' THEN 15
                        WHEN 'semester' THEN 60
                        ELSE 0
                    END
                ), 0) AS total_revenue
                FROM subscriptions
                WHERE status = 'active' ${dateFilter ? dateFilter.replace('created_at', 'start_date') : ''}
            `),

            // Popular Notes (All time popularity is usually what's shown, but let's stick to global for charts unless requested)
            pool.query("SELECT title, view_count FROM notes WHERE approval_status = 'approved' ORDER BY view_count DESC LIMIT 5"),

            // Total Views (Sum of views of notes created in range - proxy, OR total views global? 
            // User asked for "working stats". A specific range usually implies activity in that range. 
            // Since we lack a view_history table, "Total Views" usually implies Global Views unless we can filter.
            // However, sticking to the plan: Sum of views of notes *created* in the range is a valid metric for "New Content Performance". 
            // OR if range is None, it's global.
            pool.query(`SELECT COALESCE(SUM(view_count), 0) AS total_views FROM notes WHERE 1=1 ${dateFilter}`),

            // All Subs table (Show latest)
            pool.query(`
                SELECT u.name, u.email, s.plan, s.end_date as subscription_expiry, s.status
                FROM subscriptions s
                JOIN users u ON s.user_id = u.id
                ORDER BY s.start_date DESC
                LIMIT 10
            `),

            // Plan Dist (Active now)
            pool.query(`
                SELECT plan, COUNT(*) AS value
                FROM subscriptions
                WHERE status = 'active'
                GROUP BY plan
            `),

            // Pending Reports (Created in range)
            pool.query(`SELECT COUNT(*) FROM note_reports WHERE status = 'new' ${dateFilter}`),

            // Active Notes (Approved/Created in range)
            pool.query(`SELECT COUNT(*) FROM notes WHERE approval_status = 'approved' ${dateFilter}`),

            // Pending Note Approvals (Created in range - though usually we want ALL pending regardless of range, sticking to range for consistency or logic? 
            // "Pending Approvals" usually means "Current Work Queue". 
            // If I filter by "Last 7 days", do I want "Pending Notes uploaded in last 7 days" or "All Pending Notes"? 
            // The dashboard cards switch with range. "Today" -> "0 Pending" is valid if no queue.
            // But usually work queue is absolute.
            // Let's stick to the range filter for consistency with other cards.
            // Wait, existing queries use dateFilter.
            pool.query(`SELECT COUNT(*) FROM notes WHERE approval_status = 'pending' ${dateFilter}`)
        ]);

        const planDistribution = planDistributionResult.rows.map(item => ({
            name: item.plan.charAt(0).toUpperCase() + item.plan.slice(1),
            value: parseInt(item.value)
        }));

        res.json({
            totalUsers: parseInt(usersResult.rows[0].count) || 0,
            activeSubscriptions: parseInt(activeSubscriptionsResult.rows[0].count) || 0,
            totalRevenue: parseFloat(totalRevenueResult.rows[0].total_revenue) || 0,
            totalNotesViews: parseInt(totalViewsResult.rows[0].total_views) || 0,
            popularNotes: popularNotesResult.rows || [],
            allSubscriptions: allSubscriptionsResult.rows || [],
            planDistribution: planDistribution || [],
            pendingReportsCount: parseInt(pendingReportsResult.rows[0].count) || 0,
            activeNotes: parseInt(activeNotesResult.rows[0].count) || 0,
            pendingApprovals: parseInt(pendingNotesResult.rows[0].count) || 0
        });
    } catch (error) {
        console.error('❌ Error fetching admin dashboard data:', error);
        res.status(500).json({ error: 'Failed to fetch admin dashboard data' });
    }
}

async function getActiveUsers(req, res) {
    try {
        const result = await pool.query(
            "SELECT id, name, email, created_at, last_login FROM users WHERE role = 'user' ORDER BY last_login DESC NULLS LAST"
        );
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Error fetching active users:", err.message);
        res.status(500).json({ error: "Failed to fetch user data." });
    }
}

async function getAppSettings(req, res) {
    try {
        const result = await pool.query("SELECT setting_key, setting_value FROM app_settings");
        const settings = result.rows.reduce((acc, setting) => {
            acc[setting.setting_key] = setting.setting_value;
            return acc;
        }, {});
        res.json(settings);
    } catch (err) {
        console.error("❌ Error fetching app settings:", err.message);
        res.status(500).json({ error: "Failed to fetch settings." });
    }
}

// ... imports
const { sendMaintenanceOverEmail } = require('../utils/sendEmail');

// ...

async function updateAppSetting(req, res) {
    try {
        const { settingKey, settingValue } = req.body;
        // Allow string, number, or boolean
        if (settingValue === undefined || settingValue === null) {
            return res.status(400).json({ error: 'Setting value is required.' });
        }

        // Check previous state for maintenance_mode logic
        let previousValue = null;
        if (settingKey === 'maintenance_mode') {
            const prevRes = await pool.query("SELECT setting_value FROM app_settings WHERE setting_key = 'maintenance_mode'");
            previousValue = prevRes.rows[0]?.setting_value;
        }

        const result = await pool.query(
            `INSERT INTO app_settings (setting_key, setting_value)
             VALUES ($1, $2)
             ON CONFLICT (setting_key) 
             DO UPDATE SET setting_value = EXCLUDED.setting_value
             RETURNING *`,
            [settingKey, String(settingValue)]
        );

        // Logic: If Maintenance Mode was 'true' and is now 'false', notify users
        if (settingKey === 'maintenance_mode') {
            const isTurningOff = (previousValue === 'true') && (String(settingValue) === 'false');
            if (isTurningOff) {
                console.log('Maintenance mode disabled. Sending notification emails to all users...');
                // Fetch all user emails (non-blocking / background)
                pool.query("SELECT email FROM users WHERE role = 'user'").then(async (uRes) => {
                    const emails = uRes.rows.map(r => r.email);
                    for (const email of emails) {
                        await sendMaintenanceOverEmail(email).catch(e => console.error(`Failed to notify ${email}`, e));
                    }
                    console.log(`Maintenance completion emails sent to ${emails.length} users.`);
                }).catch(err => console.error("Error fetching users for maintenance notification:", err));
            }
        }

        res.json({ message: "✅ Setting updated successfully!", setting: result.rows[0] });
    } catch (err) {
        console.error("❌ Error updating app setting:", err.message);
        res.status(500).json({ error: "Failed to update setting." });
    }
}

async function getUserSubmissions(req, res) {
    try {
        const result = await pool.query(
            `SELECT n.id, n.title, n.approval_status, n.created_at, u.username
             FROM notes n
             JOIN users u ON n.user_id = u.id
             WHERE n.material_type = 'user_material'
             ORDER BY n.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Error fetching user submissions:", err.message);
        res.status(500).json({ error: "Failed to fetch user submissions." });
    }
}

async function getBadgeData(req, res) {
    try {
        const result = await pool.query("SELECT id, username, badges FROM users WHERE badges IS NOT NULL AND array_length(badges, 1) > 0");
        const usersByBadge = {};
        for (const badgeKey in allBadges) {
            usersByBadge[badgeKey] = {
                ...allBadges[badgeKey],
                users: [],
            };
        }
        result.rows.forEach(user => {
            if (user.badges) {
                user.badges.forEach(badgeKey => {
                    if (usersByBadge[badgeKey]) {
                        usersByBadge[badgeKey].users.push(user.username);
                    }
                });
            }
        });
        res.json(Object.values(usersByBadge));
    } catch (error) {
        console.error('❌ Error fetching badge data for admin:', error);
        res.status(500).json({ error: 'Failed to fetch badge data' });
    }
}

async function getAllNotes(req, res) {
    try {
        const result = await pool.query(
            `SELECT n.id, n.title, n.approval_status, n.created_at, u.username
             FROM notes n
             JOIN users u ON n.user_id = u.id
             ORDER BY n.created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Error fetching all notes for admin:", err.message);
        res.status(500).json({ error: "Failed to fetch all notes." });
    }
}

async function deleteUser(req, res, next) {
    try {
        const userId = req.params.id;

        // Use PostgreSQL's DELETE command via pool.query
        const result = await pool.query(
            "DELETE FROM users WHERE id = $1",
            [userId]
        );

        if (result.rowCount === 0) {
            // No row was deleted, meaning the user ID was not found.
            return res.status(404).json({
                status: 'fail',
                message: `No user found with ID ${userId}`
            });
        }

        // 204 No Content is the standard response for successful DELETE
        res.status(204).json({
            status: 'success',
            data: null
        });

    } catch (error) {
        console.error("Error deleting user:", error);
        // Use next(error) to send the error to the global Express handler
        next(error);
    }
}

// -------------------------------------------------------
// PHASE 2: COMMUNITY CURATION - ADMIN REPORT REVIEW (NEW)
// -------------------------------------------------------

/**
 * GET /api/admin/note-reports/pending
 * Retrieves all new/pending user reports on notes.
 */
async function getPendingNoteReports(req, res) {
    try {
        const query = `
            SELECT
                nr.id AS report_id,
                nr.reason,
                nr.comment,
                nr.created_at,
                n.id AS note_id,
                n.title AS note_title,
                n.approval_status AS note_status,
                u_reporter.username AS reporter_username,
                u_owner.username AS owner_username
            FROM note_reports nr
            JOIN notes n ON nr.note_id = n.id
            JOIN users u_reporter ON nr.reporter_id = u_reporter.id
            JOIN users u_owner ON n.user_id = u_owner.id
            WHERE nr.status = 'new'
            ORDER BY nr.created_at ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Error fetching pending note reports:", err.message);
        res.status(500).json({ error: "Failed to fetch pending note reports." });
    }
}

/**
 * PUT /api/admin/note-reports/review/:reportId
 * Allows the admin to mark a report as reviewed and optionally take action on the note.
 * Action can be 'mark_reviewed', 'reject_note', 'unapprove_note'.
 */
async function reviewNoteReport(req, res) {
    try {
        const { reportId } = req.params;
        const { action, noteId, reason } = req.body; // action, noteId (from form/payload), optional reason

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Update the status of the specific report
            const reportUpdate = await client.query(
                "UPDATE note_reports SET status = 'reviewed' WHERE id = $1 AND status = 'new' RETURNING *",
                [reportId]
            );

            if (reportUpdate.rowCount === 0) {
                await client.query('COMMIT');
                return res.status(404).json({ error: "Report not found or already reviewed." });
            }

            let noteActionMessage = "Report marked as reviewed.";

            // 2. Perform action on the note if requested
            if (action === 'reject_note') {
                await client.query(
                    "UPDATE notes SET approval_status = 'rejected', rejection_reason = $1 WHERE id = $2",
                    [reason || "Rejected due to user report.", noteId]
                );
                noteActionMessage = `Report reviewed. Note ${noteId} rejected.`;
            } else if (action === 'unapprove_note') {
                await client.query(
                    "UPDATE notes SET approval_status = 'pending', rejection_reason = $1 WHERE id = $2",
                    [reason || "Moved to pending due to user report.", noteId]
                );
                noteActionMessage = `Report reviewed. Note ${noteId} moved to pending approval.`;
            }
            // If action is 'mark_reviewed' or absent, only the report status is updated.

            await client.query('COMMIT');
            res.json({ message: noteActionMessage });

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error("❌ Error reviewing note report:", err.message);
        res.status(500).json({ error: "Failed to review note report." });
    }
}


// ... (existing code)

/**
 * GET /api/admin/notifications/stats
 * Returns counts of pending actions for the admin notification center.
 */
async function getNotificationStats(req, res) {
    try {
        const [pendingNotesResult, pendingReportsResult, unreadFeedbackResult] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM notes WHERE approval_status = 'pending'"),
            pool.query("SELECT COUNT(*) FROM note_reports WHERE status = 'new'"),
            pool.query("SELECT COUNT(*) FROM contact_messages WHERE status = 'new'")
        ]);

        res.json({
            pendingApprovals: parseInt(pendingNotesResult.rows[0].count) || 0,
            pendingReports: parseInt(pendingReportsResult.rows[0].count) || 0,
            pendingFeedback: parseInt(unreadFeedbackResult.rows[0].count) || 0
        });
    } catch (err) {
        console.error("❌ Error fetching notification stats:", err.message);
        res.status(500).json({ error: "Failed to fetch notification stats." });
    }
}

// ... (existing code)

/**
 * GET /api/admin/search
 * Global search across Users, Notes, and Reports.
 * Query Params: ?q=search_term
 */
async function searchGlobal(req, res) {
    try {
        const { q } = req.query;
        if (!q || q.trim() === '') {
            return res.json({ users: [], notes: [], reports: [] });
        }

        const searchTerm = `%${q.trim()}%`;

        // MOLECULAR TEST: Verify verification
        if (q.includes('s18_dixit')) {
            console.log("HARDCODED DEBUG TRIGGERED");
            // return res.json({
            //    users: [{id: 999, name: 'DEBUG USER', username: 's18_dixit_debug', email: 'debug@test.com', role: 'admin', is_verified: true}], 
            //    notes: [], 
            //    reports: [] 
            // });
            // Commented out to not break production flow unless confirming.
            // Actually, let's LOG and trust the query.
        }
        console.log(`[AdminSearch] Query: '${q}', Encoded: '${searchTerm}'`); // DEBUG LOG

        const [usersResult, notesResult, reportsResult] = await Promise.all([
            // Search Users
            pool.query(
                `SELECT id, name, username, email, role, is_verified 
                 FROM users 
                 WHERE (name ILIKE $1 OR username ILIKE $1 OR email ILIKE $1) 
                 LIMIT 5`,
                [searchTerm]
            ),
            // Search Notes (Title, University, Subject)
            pool.query(
                `SELECT n.id, n.title, n.approval_status, n.university_name, n.subject, u.username as uploader
                 FROM notes n
                 JOIN users u ON n.user_id = u.id
                 WHERE (n.title ILIKE $1 OR n.university_name ILIKE $1 OR n.subject ILIKE $1)
                 limit 5`,
                [searchTerm]
            ),
            // Search Reports (Reason, Comment)
            pool.query(
                `SELECT nr.id, nr.reason, nr.status, n.title as note_title 
                 FROM note_reports nr
                 JOIN notes n ON nr.note_id = n.id
                 WHERE (nr.reason ILIKE $1 OR nr.comment ILIKE $1)
                 LIMIT 3`,
                [searchTerm]
            )
        ]);

        console.log(`[AdminSearch] Results - Users: ${usersResult.rows.length}, Notes: ${notesResult.rows.length}, Reports: ${reportsResult.rows.length}`); // DEBUG LOG

        res.json({
            users: usersResult.rows,
            notes: notesResult.rows,
            reports: reportsResult.rows
        });

    } catch (err) {
        console.error("❌ Global search error:", err.message);
        res.status(500).json({ error: "Search failed." });
    }
}

// -------------------------------------------------------
// PHASE 9: FEEDBACK / CONTACT MESSAGES
// -------------------------------------------------------

async function getFeedbackMessages(req, res) {
    try {
        const result = await pool.query(`
            SELECT * FROM contact_messages 
            ORDER BY created_at DESC 
            LIMIT 50
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("❌ Error fetching feedback:", err.message);
        res.status(500).json({ error: "Failed to fetch feedback." });
    }
}

async function markFeedbackAsRead(req, res) {
    try {
        const { id } = req.params;
        await pool.query("UPDATE contact_messages SET status = 'read', is_read = TRUE WHERE id = $1", [id]);
        res.json({ message: "Marked as read" });
    } catch (err) {
        console.error("❌ Error marking feedback read:", err.message);
        res.status(500).json({ error: "Failed to update feedback." });
    }
}

/**
 * GET /api/admin/users/:id/details
 * Fetches detailed profile and uploads for a specific user.
 */
async function getUserDetails(req, res) {
    try {
        const { id } = req.params;

        if (!id || id === 'undefined' || id === 'null') {
            return res.status(400).json({ error: "Invalid User ID." });
        }

        // 1. Fetch User Details (Removed 'badges' and 'last_login' as they don't exist in schema)
        const userResult = await pool.query(
            `SELECT id, name, username, email, role, is_verified, created_at 
             FROM users WHERE id = $1`,
            [id]
        );

        if (userResult.rowCount === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        // 2. Fetch User's Notes (Removed 'semester' as it isn't in schema)
        // Using 'course', 'subject', 'university_name', etc.
        const notesResult = await pool.query(
            `SELECT id, title, subject, university_name, course, approval_status, view_count, created_at, material_type
             FROM notes 
             WHERE user_id = $1 
             ORDER BY created_at DESC`,
            [id]
        );

        res.json({
            user: userResult.rows[0],
            notes: notesResult.rows
        });

    } catch (err) {
        console.error("❌ Error fetching user details:", err.message);
        res.status(500).json({ error: "Failed to fetch user details." });
    }
}

module.exports = {
    getDashboardData,
    getActiveUsers,
    getAppSettings,
    updateAppSetting,
    getUserSubmissions,
    getBadgeData,
    getAllNotes,
    deleteUser,
    getPendingNoteReports,
    reviewNoteReport,
    getNotificationStats,
    searchGlobal,
    getUserDetails,
    getFeedbackMessages,
    markFeedbackAsRead
};