// src/controllers/noteController.js
// Core controller for notes: uploads, browsing, ratings, admin review, watermarking, multi-upload to Cloudinary

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const pool = require("../config/db");
const { updateUserFreeViews } = require("../models/userModel");
const { pdfQueue } = require('../config/queue');

const streamifier = require('streamifier');
const multer = require('multer');

// Your model functions (ensure these exist in ../models/noteModel)
const { createNote, updateNote, findNoteById, deleteNote, incrementNoteViewCount, findNoteByIdAndJoinUser, getLatestApprovedVersion, createNoteVersion } = require("../models/noteModel");

// ------------------ Notification Helper (NEW) ------------------
/**
 * Inserts a new notification and associates it with favorited users of a note.
 * Runs outside the main transaction (best practice for background tasks).
 */
async function notifyFavoritedUsers(noteId, noteTitle, type = 'new') {
  try {
    const title = type === 'new' ? `Note Approved: ${noteTitle}` : `Update Available: ${noteTitle}`;
    const message = type === 'new'
      ? `The note "${noteTitle}" you uploaded/requested is now available!`
      : `A new version of the note "${noteTitle}" is now available.`;

    const notificationType = type === 'new' ? 'upload' : 'update';
    const referenceUrl = `/notes/view/${noteId}`;

    // 1. Get all user IDs who favorited this note
    const favouritedUsersResult = await pool.query(
      "SELECT user_id FROM user_favourites WHERE note_id = $1",
      [noteId]
    );
    const userIds = favouritedUsersResult.rows.map(row => row.user_id);

    // 2. Insert the main notification
    const notificationResult = await pool.query(
      `INSERT INTO notifications (title, message, type, reference_id, reference_url) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [title, message, notificationType, noteId, referenceUrl]
    );
    const notificationId = notificationResult.rows[0].id;

    // 3. Associate the notification with users (batch insert into user_notifications)
    if (userIds.length > 0) {
      const userNotificationInserts = userIds.map(userId => `(${userId}, ${notificationId})`).join(', ');
      await pool.query(`
                INSERT INTO user_notifications (user_id, notification_id)
                VALUES ${userNotificationInserts}
                ON CONFLICT DO NOTHING
            `);
      console.log(`[Notification] Sent ${userIds.length} notifications for Note ID ${noteId}`);
    }

  } catch (err) {
    console.error("❌ Notification error for version update:", err.message);
  }
}


// ------------------ Cloudinary setup ------------------
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ------------------ multer memory storage ------------------
const MAX_FILES = parseInt(process.env.MULTI_UPLOAD_MAX_FILES || '10', 10);
const MAX_FILE_SIZE_BYTES = parseInt(process.env.MULTI_UPLOAD_MAX_FILESIZE || `${20 * 1024 * 1024}`, 10);
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'orionotes/notes';

const memoryStorage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage: memoryStorage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// ------------------ helper: upload buffer to cloudinary ------------------
function uploadBufferToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const options = {
      resource_type: 'raw',
      folder: CLOUDINARY_FOLDER,
      public_id: publicId,
      overwrite: false,
    };
    const uploadStream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

// ------------------ Multi-upload handler ------------------
/**
 * POST /api/notes/multi-upload
 * Protected: req.user must be set by auth middleware
 */
async function handleMultiUpload(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const userId = req.user.id;
    const { titles, material_types, fields, courses, subjects, university_names, is_free, approval_status } = req.body;

    // Parse arrays (multipart/form-data sends arrays as multiple fields with same key or indexed keys)
    // We expect the frontend to send arrays or single values.
    // Helper to ensure array
    const toArray = (val) => {
      if (!val) return [];
      return Array.isArray(val) ? val : [val];
    };

    const titleList = toArray(titles);
    const typeList = toArray(material_types);
    const fieldList = toArray(fields);
    const courseList = toArray(courses);
    const subjectList = toArray(subjects);
    const uniList = toArray(university_names);
    // is_free comes as an array of strings "true"/"false" or booleans
    const isFreeList = toArray(is_free);

    // Allow admin to override status (e.g. 'approved')
    let startStatus = (req.user.role === 'admin') ? 'approved' : 'pending';
    if (req.user.role === 'admin' && approval_status) {
      startStatus = approval_status;
    }

    // Parse state list (frontend must send 'states' which aligns with other arrays)
    // Note: If using AdminUpload, it might send 'state' inside formData. 
    // We'll look for 'states' or 'institution_state' in body.
    const stateList = toArray(req.body.states || req.body.institution_states || []);

    const createdNotes = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const f = req.files[i];
      const title = titleList[i] || f.originalname;
      const matType = typeList[i] || 'personal_material';
      const isFreeVal = isFreeList[i] === 'true' || isFreeList[i] === true;

      try {
        let fileUrl, publicId, pdfPath;

        // Try Cloudinary if keys exist
        if (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_SECRET) { // typo in secret key name check, usually API_SECRET
          try {
            const randomHex = crypto.randomBytes(6).toString('hex');
            const safeName = f.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\.-]/g, '');
            const pid = `${userId}_${Date.now()}_${randomHex}_${path.parse(safeName).name}`;
            const uploadResult = await uploadBufferToCloudinary(f.buffer, pid);
            fileUrl = uploadResult.secure_url;
            publicId = uploadResult.public_id;
          } catch (cloudErr) {
            console.warn("Cloudinary upload failed, falling back to local:", cloudErr.message);
          }
        }

        // Fallback to local if no Cloudinary result
        if (!fileUrl) {
          const filename = `${Date.now()}_${f.originalname.replace(/\s+/g, '_')}`;
          const uploadDir = path.join(__dirname, '..', '..', 'uploads');
          await fs.mkdir(uploadDir, { recursive: true }).catch(() => { });
          const diskPath = path.join(uploadDir, filename);
          await fs.writeFile(diskPath, f.buffer);
          pdfPath = `/uploads/${filename}`;
          // fileUrl for local can be the same or full URL if needed, but DB usually takes null for file_url if local
        }

        // 2. Insert into DB
        // Construct insert query based on material type
        let insertSql, insertVals;

        if (matType === 'university_material') {
          insertSql = `
            INSERT INTO notes (
              user_id, title, pdf_path, file_url, cloudinary_public_id,
              material_type, university_name, course, subject,
              is_free, approval_status, state
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
          `;
          insertVals = [
            userId, title, pdfPath || null, fileUrl || null, publicId || null,
            'university_material', uniList[i] || null, courseList[i] || null, subjectList[i] || null,
            isFreeVal, startStatus, stateList[i] || null
          ];
        } else {
          // personal
          const institutionType = ["Class 12", "Class 11", "Class 10"].includes(fieldList[i]) ? "School" : "College";
          insertSql = `
            INSERT INTO notes (
              user_id, title, pdf_path, file_url, cloudinary_public_id,
              material_type, institution_type, field, course, subject,
              is_free, approval_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
          `;
          insertVals = [
            userId, title, pdfPath || null, fileUrl || null, publicId || null,
            'personal_material', institutionType, fieldList[i] || null, courseList[i] || null, subjectList[i] || null,
            isFreeVal, startStatus
          ];
        }

        const result = await pool.query(insertSql, insertVals);
        createdNotes.push(result.rows[0]);
      } catch (err) {
        console.error('Upload failed for file', f.originalname, err);
        errors.push({ file: f.originalname, error: err.message || String(err) });
      }
    }

    if (createdNotes.length === 0) {
      return res.status(500).json({ error: 'All uploads failed', details: errors });
    }

    return res.status(201).json({ message: `Uploaded ${createdNotes.length} files`, notes: createdNotes, errors });
  } catch (err) {
    console.error('handleMultiUpload error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: `File size exceeds limit of ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))} MB` });
    }
    if (err.message && err.message.includes('Cloudinary')) {
      return res.status(502).json({ error: 'Cloudinary upload failed. Please check server configuration.' });
    }
    return res.status(500).json({ error: 'Multi-upload failed', details: err.message });
  }
}

// ------------------ Original single-file upload ------------------
async function uploadUserNote(req, res) {
  try {
    const {
      title, material_type,
      field, course, subject,
      university_name, state
    } = req.body;

    const userId = req.user.id;
    const username = req.user.username;

    if (!title || !req.file || !material_type) {
      return res.status(400).json({ error: "Title, PDF file, and material type are required" });
    }
    if (!username) {
      return res.status(400).json({ error: "User information is missing. Please log in again." })
    }

    let pdfPath;
    let absolutePath;
    if (req.file.path) {
      pdfPath = `/uploads/${req.file.filename}`;
      absolutePath = req.file.path;
    } else if (req.file && req.file.buffer) {
      const filename = `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`;
      const uploadDir = path.join(__dirname, '..', '..', 'uploads');
      await fs.mkdir(uploadDir, { recursive: true }).catch(() => { });
      const diskPath = path.join(uploadDir, filename);
      await fs.writeFile(diskPath, req.file.buffer);
      pdfPath = `/uploads/${filename}`;
      absolutePath = diskPath;
    } else {
      return res.status(400).json({ error: 'Upload file missing' });
    }

    let notePayload = {
      title,
      pdf_path: pdfPath,
      user_id: userId,
      is_free: false,
      approval_status: req.user.role === 'admin' ? 'approved' : 'pending',
    };

    if (material_type === 'university_material') {
      notePayload = {
        ...notePayload,
        material_type: 'university_material',
        university_name: university_name,
        course: course,
        subject: subject,
        state: state || null,
      };
    } else {
      const institutionType = ["Class 12", "Class 11", "Class 10"].includes(field) ? "School" : "College";
      notePayload = {
        ...notePayload,
        material_type: 'personal_material',
        institution_type: institutionType,
        field: field || null,
        course: course || null,
        subject: subject || null,
      };
    }

    const newNote = await createNote(notePayload);

    await pdfQueue.add('watermarkUserUpload', {
      filePath: absolutePath,
      username: username,
    });

    res.status(201).json({ message: "✅ Note uploaded! It will be processed and submitted for approval.", note: newNote });

  } catch (err) {
    console.error("❌ User note upload error:", err);
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(e => console.error("Failed to clean up file:", e));
    }
    res.status(500).json({ error: "Failed to upload note." });
  }
}

// ------------------ Browsing, review, favourites, ratings, etc. ------------------

async function getFilteredNotes(req, res) {
  try {
    const { q, material_type, institution_type, field, course, subject, university_name, source, date_range, state } = req.query;
    const userId = req.user ? req.user.id : null; // data from authMiddleware

    let query = `
        SELECT n.id, n.title, n.view_count, n.is_free, n.created_at, n.material_type, n.course, n.subject, n.university_name, n.state, u.username, u.role
        FROM notes n
        JOIN users u ON n.user_id = u.id
        WHERE n.approval_status = 'approved' AND (n.expiry_date IS NULL OR n.expiry_date > NOW())
    `;
    const values = [];
    let paramIndex = 1;

    // --- Source Filter ---
    if (source === 'my_notes' && userId) {
      query += ` AND n.user_id = $${paramIndex++}`;
      values.push(userId);
    } else if (source === 'admin_notes') {
      query += ` AND u.role = 'admin'`;
    } else if (source === 'university') {
      query += ` AND n.material_type = 'university_material'`;
    }

    // --- Date Range Filter ---
    if (date_range) {
      const now = new Date();
      let pastDate = new Date();

      switch (date_range) {
        case '1_day': pastDate.setDate(now.getDate() - 1); break;
        case '1_week': pastDate.setDate(now.getDate() - 7); break;
        case '2_week': pastDate.setDate(now.getDate() - 14); break;
        case '3_week': pastDate.setDate(now.getDate() - 21); break;
        case '4_week': pastDate.setDate(now.getDate() - 28); break;
        default: pastDate = null;
      }

      if (pastDate) {
        query += ` AND n.created_at >= $${paramIndex++}`;
        values.push(pastDate.toISOString());
      }
    }


    const addFilter = (column, value) => {
      if (value) {
        query += ` AND n.${column} ILIKE $${paramIndex++}`;
        values.push(value);
      }
    };

    // Standard Filters
    addFilter('material_type', material_type);
    addFilter('institution_type', institution_type);
    addFilter('field', field);
    addFilter('course', course);
    addFilter('subject', subject);
    // REMOVED DUPLICATE SUBJECT LINE HERE
    addFilter('university_name', university_name);
    addFilter('state', state);

    if (q) {
      query += ` AND n.title ILIKE $${paramIndex++}`;
      values.push(`%${q}%`);
    }

    // Sorting logic
    const { sort } = req.query;
    if (sort === 'popular') {
      query += " ORDER BY n.view_count DESC, n.created_at DESC";
    } else if (sort === 'oldest') {
      query += " ORDER BY n.created_at ASC";
    } else {
      // Default: Newest
      query += " ORDER BY n.created_at DESC";
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching filtered notes:", err.message);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
}

const universityList = require('../data/universityList'); // Import static data

/**
 * GET /api/notes/available-subjects
 * Retrieves all distinct, approved subjects, courses, and fields
 * to populate the browsing filters. Merges static university data with DB data.
 */
async function getAvailableSubjects(req, res) {
  try {
    const [
      subjectsResult,
      coursesResult,
      fieldsResult,
      dbHierarchyResult
    ] = await Promise.all([
      pool.query("SELECT DISTINCT subject FROM notes WHERE subject IS NOT NULL AND subject != '' AND approval_status = 'approved' ORDER BY subject ASC"),
      pool.query("SELECT DISTINCT course FROM notes WHERE course IS NOT NULL AND course != '' AND approval_status = 'approved' ORDER BY course ASC"),
      pool.query("SELECT DISTINCT field FROM notes WHERE field IS NOT NULL AND field != '' AND approval_status = 'approved' ORDER BY field ASC"),
      // Fetch DB hierarchy: State -> University -> Course
      // Note: We only care about university_material for this hierarchy merging
      pool.query(`
          SELECT DISTINCT state, university_name, course 
          FROM notes 
          WHERE approval_status = 'approved' 
            AND material_type = 'university_material'
            AND state IS NOT NULL
            AND university_name IS NOT NULL
      `)
    ]);

    const normalize = (rows, key) => rows.map(row => row[key]);

    // 1. Build Base Hierarchy from Static List
    const hierarchy = {}; // Structure: { [State]: { [University]: Set(Courses) } }

    universityList.forEach(item => {
      if (!hierarchy[item.state]) hierarchy[item.state] = {};
      item.universities.forEach(uni => {
        if (!hierarchy[item.state][uni.name]) hierarchy[item.state][uni.name] = new Set();
        uni.courses.forEach(c => hierarchy[item.state][uni.name].add(c));
      });
    });

    // 2. Merge DB Data into Hierarchy
    dbHierarchyResult.rows.forEach(row => {
      const { state, university_name, course } = row;
      if (!hierarchy[state]) hierarchy[state] = {};
      if (!hierarchy[state][university_name]) hierarchy[state][university_name] = new Set();
      if (course) hierarchy[state][university_name].add(course);
    });

    // 3. Flatten Hierarchy for Frontend Consumption
    // Frontend expects: hierarchy: { State: [UniversityName, ...] } 
    // AND we probably need a way to look up courses for a university?
    // Current FilterBar logic:
    // - states: list of states
    // - hierarchy: { State: [UniversityName] }
    // - courses: list of ALL courses (global)
    // - To support "University -> Course", we might need a richer structure or just rely on global course list + db filtering.
    // However, user specifically asked for "University Name -> Courses Generally Offered". 
    // If we want the Course dropdown to be specific to the selected university, FilterBar needs modification or more data.
    // The current FilterBar implementation calculates `courses` as a global list.
    // Proposed Improvement: Send a separate `universityCourses` map: { UniversityName: [Courses] }

    const finalStates = Object.keys(hierarchy).sort();
    const finalHierarchy = {}; // State -> [University Names]
    const universityCourses = {}; // University Name -> [Courses]
    const globalCourses = new Set(normalize(coursesResult.rows, 'course'));

    finalStates.forEach(state => {
      finalHierarchy[state] = Object.keys(hierarchy[state]).sort();
      finalHierarchy[state].forEach(uniName => {
        const uniCourseSet = hierarchy[state][uniName];
        universityCourses[uniName] = Array.from(uniCourseSet).sort();
        uniCourseSet.forEach(c => globalCourses.add(c));
      });
    });

    res.json({
      subjects: normalize(subjectsResult.rows, 'subject'),
      courses: Array.from(globalCourses).sort(),
      fields: normalize(fieldsResult.rows, 'field'),
      states: finalStates,
      hierarchy: finalHierarchy,
      universityCourses: universityCourses // New field for frontend to use
    });

  } catch (err) {
    console.error("❌ Error fetching available subjects:", err.message);
    res.status(500).json({ error: "Failed to fetch filter data." });
  }
}

async function addNote(req, res) {
  try {
    const { title, material_type, institution_type, field, course, subject, university_name, state, isFree } = req.body;
    const userId = req.user.id;
    if (!title || !req.file || !material_type) {
      return res.status(400).json({ error: "Title, PDF file, and material type are required" });
    }
    const isFreeBool = isFree === 'true';
    const pdfBytes = await fs.readFile(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    pdfDoc.setProducer('Learnify');
    pdfDoc.setCreator('Learnify Admin');
    const finalPdfBytes = await pdfDoc.save();
    await fs.writeFile(req.file.path, finalPdfBytes);
    const pdfPath = `/uploads/${req.file.filename}`;
    const newNote = await createNote({
      title,
      pdf_path: pdfPath,
      user_id: userId,
      is_free: isFreeBool,
      material_type,
      approval_status: 'approved',
      institution_type: institution_type || null,
      field: field || null,
      course: course || null,
      subject: subject || null,
      subject: subject || null,
      university_name: university_name || null,
      state: state || null,
    });
    res.status(201).json(newNote);
  } catch (err) {
    console.error("❌ Admin note creation error:", err);
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(e => console.error("Failed to clean up file:", e));
    }
    res.status(500).json({ error: "Failed to create note" });
  }
}

async function getPendingNotes(req, res) {
  try {
    const result = await pool.query(`
          SELECT n.id, n.title, n.created_at, u.username
          FROM notes n
          JOIN users u ON n.user_id = u.id
          WHERE n.approval_status = 'pending'
          ORDER BY n.created_at ASC
      `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching pending notes:", err.message);
    res.status(500).json({ error: "Failed to fetch pending notes." });
  }
}

async function reviewNote(req, res) {
  try {
    const { noteId } = req.params;
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Invalid action." });
    }
    if (action === 'reject' && !reason) {
      return res.status(400).json({ error: "A reason is required for rejection." });
    }
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    const updatedNote = await updateNote(noteId, {
      approval_status: newStatus,
      rejection_reason: reason || null,
    });

    if (!updatedNote) {
      return res.status(404).json({ error: "Note not found." });
    }

    if (newStatus === 'approved') {
      notifyFavoritedUsers(updatedNote.id, updatedNote.title, 'new').catch(e => console.error('Background notification failed:', e));
    }

    res.json({ message: `Note has been ${newStatus}.`, note: updatedNote });
  } catch (err) {
    console.error("Error reviewing note:", err.message);
    res.status(500).json({ error: "Failed to review note." });
  }
}

async function addFavourite(req, res) {
  try {
    const { noteId } = req.params;
    const userId = req.user.id;
    await pool.query(
      'INSERT INTO user_favourites (user_id, note_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, noteId]
    );
    res.status(201).json({ message: "Added to favourites." });
  } catch (err) {
    console.error("Error adding favourite:", err.message);
    res.status(500).json({ error: "Failed to add favourite." });
  }
}

async function removeFavourite(req, res) {
  try {
    const { noteId } = req.params;
    const userId = req.user.id;
    await pool.query(
      'DELETE FROM user_favourites WHERE user_id = $1 AND note_id = $2',
      [userId, noteId]
    );
    res.json({ message: "Removed from favourites." });
  } catch (err) {
    console.error("Error removing favourite:", err.message);
    res.status(500).json({ error: "Failed to remove favourite." });
  }
}

async function getFavourites(req, res) {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
          SELECT n.id, n.title, n.view_count, n.is_free
          FROM notes n
          JOIN user_favourites uf ON n.id = uf.note_id
          WHERE uf.user_id = $1 AND n.approval_status = 'approved'
          ORDER BY uf.created_at DESC
      `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error getting favourites:", err.message);
    res.status(500).json({ error: "Failed to get favourites." });
  }
}

async function getFavouriteIds(req, res) {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT note_id FROM user_favourites WHERE user_id = $1',
      [userId]
    );
    const ids = result.rows.map(row => row.note_id);
    res.json(ids);
  } catch (err) {
    console.error("Error fetching favourite IDs:", err.message);
    res.status(500).json({ error: "Failed to get favourite IDs." });
  }
}

const jwt = require('jsonwebtoken'); // Ensure this is available

async function getSingleNote(req, res) {
  try {
    const { id } = req.params;
    const note = await findNoteByIdAndJoinUser(id);
    if (!note) {
      return res.status(404).json({ error: "Note not found." });
    }

    // Default access state
    let hasAccess = false;
    let accessStatus = null; // 'pending', 'approved', 'rejected', or null
    let userId = null;
    let userRole = null;

    // 1. Check if user is logged in (Manual Token Decode for optional auth)
    // We do this because getSingleNote is a public route, but we need to know who is asking
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "smart_notes_secure_secret");
        userId = decoded.id;
        userRole = decoded.role;
      } catch (e) {
        // Invalid token, treat as guest
        // console.warn("Invalid token in getSingleNote", e.message);
      }
    }

    // 2. Determine Access
    if (userId) {
      // --- NEW: Unique View Counting ---
      // Insert into user_views. If conflict (dup), do nothing.
      // RETURNING id allows us to know if a new row was inserted.
      const viewResult = await pool.query(
        "INSERT INTO user_views (user_id, note_id) VALUES ($1, $2) ON CONFLICT (user_id, note_id) DO NOTHING RETURNING id",
        [userId, id]
      );

      // If a new view was recorded, increment the note's total view count
      if (viewResult.rowCount > 0) {
        await pool.query("UPDATE notes SET view_count = view_count + 1 WHERE id = $1", [id]);
      }
    }

    if (note.material_type === 'university_material') {
      hasAccess = true; // Publicly accessible
    } else {
      // Personal Material logic
      if (userId) {
        if (userRole === 'admin' || note.owner_role === 'admin' || String(note.user_id) === String(userId)) {
          hasAccess = true;
        } else {
          // Check for permission entry
          const permResult = await pool.query(
            "SELECT status FROM note_access_permissions WHERE note_id = $1 AND requester_id = $2",
            [id, userId]
          );
          if (permResult.rows.length > 0) {
            accessStatus = permResult.rows[0].status;
            if (accessStatus === 'approved') {
              hasAccess = true;
            }
          }
        }
      } else {
        // Even if guest (not logged in), check if owner is admin
        if (note.owner_role === 'admin') {
          hasAccess = true;
        }
      }
    }

    // 3. Return note with access flags and mapped username
    res.json({
      ...note,
      username: note.owner_username, // Map for frontend compatibility
      has_access: hasAccess,
      access_status: accessStatus
    });

  } catch (err) {
    console.error("Error fetching single note:", err.message);
    res.status(500).json({ error: "Failed to fetch note details." });
  }
}

async function serveNoteWithWatermark(req, res) {
  try {
    const { id } = req.params;
    const viewingUser = req.user; // authMiddleware guarantees this
    const note = await findNoteByIdAndJoinUser(id);
    if (!note) {
      return res.status(404).json({ error: "Note not found." });
    }

    // --- ACCESS CONTROL ENFORCEMENT ---
    if (note.material_type !== 'university_material') {
      // It is Personal Material
      // Allow access if viewer is admin OR viewer is owner OR note owner is admin
      // Allow access if viewer is admin OR viewer is owner OR note owner is admin
      if (viewingUser.role !== 'admin' && String(note.user_id) !== String(viewingUser.id) && note.owner_role !== 'admin') {
        // Check permissions
        const permResult = await pool.query(
          "SELECT status FROM note_access_permissions WHERE note_id = $1 AND requester_id = $2 AND status = 'approved'",
          [id, viewingUser.id]
        );
        if (permResult.rows.length === 0) {
          return res.status(403).json({ error: "Access denied. You must request permission to view this note." });
        }
      }
    }
    // ----------------------------------

    // If note is stored on Cloudinary, fetch remote and watermark
    if (note.cloudinary_public_id || note.file_url) {
      const fetch = globalThis.fetch || require('node-fetch');
      const remoteUrl = note.file_url;
      const resp = await fetch(remoteUrl);
      if (!resp.ok) throw new Error('Failed to fetch remote PDF for watermarking');
      const remoteBuffer = Buffer.from(await resp.arrayBuffer());
      const pdfDoc = await PDFDocument.load(remoteBuffer);
      // Removed logo logic by user request
      if (viewingUser.role !== 'admin' && String(note.user_id) !== String(viewingUser.id)) {
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const pages = pdfDoc.getPages();
        for (const page of pages) {
          const { width, height } = page.getSize();
          page.drawText(`Viewed by ${viewingUser.username}`, {
            x: width / 2 - 100, y: height / 2, font, size: 42, color: rgb(0.8, 0.2, 0.2), opacity: 0.12, rotate: { type: 'degrees', angle: -45 },
          });
        }
      }
      const finalPdfBytes = await pdfDoc.save();
      res.setHeader('Content-Security-Policy', "frame-src 'self' blob:");
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${note.title}.pdf"`);
      return res.send(Buffer.from(finalPdfBytes));
    }

    // Local file path handling
    const notePath = path.join(__dirname, '..', '..', 'uploads', path.basename(note.pdf_path));
    // Removed logo logic

    const pdfBytes = await fs.readFile(notePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    // Removed embedPng logic
    if (viewingUser.role !== 'admin' && String(note.user_id) !== String(viewingUser.id)) {
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawText(`Viewed by ${viewingUser.username}`, {
          x: width / 2 - 100, y: height / 2, font, size: 50, color: rgb(0.8, 0.2, 0.2), opacity: 0.15, rotate: { type: 'degrees', angle: -45 },
        });
      }
    }
    const finalPdfBytes = await pdfDoc.save();
    res.setHeader('Content-Security-Policy', "frame-src 'self' blob:");
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${note.title}.pdf"`);
    res.send(Buffer.from(finalPdfBytes));
  } catch (err) {
    console.error("❌ Error serving PDF:", err && err.message ? err.message : err);
    if (err && err.code === 'ENOENT') {
      return res.status(500).json({ error: "Could not serve the note. PDF file or logo asset is missing on the server." });
    }
    res.status(500).json({ error: "Could not serve the note." });
  }
}

async function getFreeNote(req, res) {
  try {
    const result = await pool.query(
      "SELECT id, pdf_path, file_url, cloudinary_public_id FROM notes WHERE is_free = TRUE AND approval_status = 'approved' ORDER BY created_at DESC LIMIT 1"
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No free note available at the moment.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error fetching free note:", err.message);
    res.status(500).json({ error: "Failed to fetch free note." });
  }
}


/**
 * POST /api/notes/:noteId/report
 * Allows a user to report/flag a note for review.
 */
async function reportNote(req, res) {
  try {
    const { noteId } = req.params;
    const { reason, comment } = req.body;
    const reporterId = req.user.id;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: "A reason is required to report a note." });
    }

    // Check if the note exists
    const note = await findNoteById(noteId);
    if (!note) {
      return res.status(404).json({ error: "Note not found." });
    }

    // Check if the user is reporting their own note
    if (note.user_id === reporterId) {
      return res.status(400).json({ error: "You cannot report your own note." });
    }

    // Insert the report into the new note_reports table
    const query = `
      INSERT INTO note_reports (note_id, reporter_id, reason, comment, status)
      VALUES ($1, $2, $3, $4, 'new')
      RETURNING id, created_at
    `;
    const values = [noteId, reporterId, reason, comment];

    try {
      const result = await pool.query(query, values);

      // Optional: Trigger a notification to admins about the new report

      return res.status(201).json({
        message: "Note successfully reported. An admin will review it shortly.",
        reportId: result.rows[0].id
      });
    } catch (e) {
      // PostgreSQL error code for unique violation (23505)
      if (e.code === '23505' && e.constraint === 'note_reports_note_id_reporter_id_key') {
        return res.status(409).json({ error: "You have already submitted a report for this note." });
      }
      throw e; // Re-throw other errors
    }

  } catch (err) {
    console.error("❌ Error submitting note report:", err.message);
    res.status(500).json({ error: "Server error while submitting report." });
  }
}


async function uploadNoteVersion(req, res) {
  try {
    const { noteId } = req.params;
    const { newTitle } = req.body;
    const uploaderId = req.user.id;
    const file = req.file;

    if (!file) return res.status(400).json({ error: "New PDF file is required." });
    if (!newTitle) return res.status(400).json({ error: "New title is required." });

    const existingNote = await findNoteById(noteId);
    if (!existingNote || existingNote.user_id !== uploaderId) {
      return res.status(403).json({ error: "You cannot submit a new version for this note." });
    }
    if (existingNote.approval_status !== 'approved') {
      return res.status(400).json({ error: `Cannot update version. Note status is '${existingNote.approval_status}'.` });
    }

    // 1. Calculate file hash for uniqueness check
    const hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // 2. Upload the new file to Cloudinary
    const randomHex = crypto.randomBytes(6).toString('hex');
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\.-]/g, '');
    const publicId = `${uploaderId}_version_${noteId}_${Date.now()}_${randomHex}_${path.parse(safeName).name}`;
    const uploadResult = await uploadBufferToCloudinary(file.buffer, publicId);

    // 3. Find the previous approved version's ID
    const latestApproved = await getLatestApprovedVersion(noteId);

    // 4. Create the new version entry in the database (status = 'pending')
    const newVersion = await createNoteVersion({
      note_id: noteId,
      uploader_id: uploaderId,
      title: newTitle,
      file_url: uploadResult.secure_url,
      cloudinary_public_id: uploadResult.public_id,
      version_hash: hash,
      previous_version_id: latestApproved ? latestApproved.id : null,
    });

    res.status(201).json({
      message: "New version successfully submitted for review.",
      version: newVersion,
    });
  } catch (err) {
    console.error("❌ Version upload failed:", err);
    res.status(500).json({ error: "Failed to submit new note version." });
  }
}

async function reviewNoteVersion(req, res) {
  const { versionId } = req.params;
  const { action } = req.body;

  if (action !== 'approve') {
    return res.status(400).json({ error: 'Only approval is handled here.' });
  }

  try {
    // Assume findNoteVersionById exists in noteModel
    const version = await pool.query("SELECT * FROM note_versions WHERE id = $1", [versionId]);
    if (version.rowCount === 0) return res.status(404).json({ error: "Version not found." });
    const { note_id, title, file_url, cloudinary_public_id } = version.rows[0];

    // This function MUST be implemented in noteModel.js to handle the transaction
    const result = await updateNoteToNewVersion(note_id, versionId, {
      title, file_url, cloudinary_public_id
    });

    // PHASE 2 FIX: Notify users who favorited the original note
    notifyFavoritedUsers(note_id, title, 'update').catch(e => console.error('Background notification failed:', e));

    return res.json({ message: "Version approved and live!", note: result.note, version: result.version });

  } catch (e) {
    console.error("❌ Version review/approval failed:", e);
    return res.status(500).json({ error: "Failed to approve version." });
  }
}

async function deleteMyNotes(req, res) {
  try {
    const userId = req.user.id;
    const { noteIds } = req.body;
    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return res.status(400).json({ error: "Note IDs must be provided in an array." });
    }
    const result = await pool.query(
      "DELETE FROM notes WHERE id = ANY($1::int[]) AND user_id = $2 RETURNING pdf_path, file_url, cloudinary_public_id",
      [noteIds, userId]
    );

    for (const row of result.rows) {
      try {
        if (row.cloudinary_public_id) {
          await cloudinary.uploader.destroy(row.cloudinary_public_id, { resource_type: 'raw' }).catch(e => console.warn('Cloudinary deletion warning:', e.message));
        } else if (row.pdf_path) {
          const filePath = path.join(__dirname, '..', '..', 'uploads', path.basename(row.pdf_path));
          await fs.unlink(filePath).catch(err => console.error("Failed to delete file:", err.message));
        }
      } catch (e) {
        console.error('Cleanup error for deleted note:', e.message);
      }
    }
    res.json({ message: `Successfully deleted ${result.rowCount} notes.` });
  } catch (err) {
    console.error("❌ Error deleting my notes:", err.message);
    res.status(500).json({ error: "Failed to delete notes." });
  }
}

// Placeholder functions
async function editNote(req, res) { return res.status(501).json({ error: "Not Implemented" }); }
async function removeNote(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const note = await findNoteById(id);
    if (!note) {
      return res.status(404).json({ error: "Note not found." });
    }

    // Allow if admin or if user owns the note
    if (userRole !== 'admin' && note.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized to delete this note." });
    }

    // NEW (Delete Request Flow): If user is NOT admin, mark for deletion instead
    if (userRole !== 'admin') {
      const { reason } = req.body;
      await pool.query(
        "UPDATE notes SET deletion_requested = TRUE, deletion_reason = $1 WHERE id = $2",
        [reason || 'User requested deletion', id]
      );

      // Notify admins (optional, but good practice)
      // We can iterate admins and send notification here if desired.

      return res.json({ message: "Deletion request submitted for admin approval." });
    }

    // IF ADMIN: Proceed to actual deletion
    // Delete file from Cloudinary or Local Storage
    if (note.cloudinary_public_id) {
      await cloudinary.uploader.destroy(note.cloudinary_public_id, { resource_type: 'raw' });
    } else if (note.pdf_path) {
      const filePath = path.join(__dirname, '..', '..', 'uploads', path.basename(note.pdf_path));
      await fs.unlink(filePath).catch(err => console.error("Failed to delete file:", err.message));
    }

    await deleteNote(id);
    res.json({ message: "Note deleted successfully." });
  } catch (err) {
    console.error("Error deleting note:", err.message);
    res.status(500).json({ error: "Failed to delete note." });
  }
}

async function getAllNotes(req, res) {
  try {
    // Admin only: fetch ALL notes with user details
    const result = await pool.query(`
      SELECT n.*, u.username, u.email 
      FROM notes n 
      LEFT JOIN users u ON n.user_id = u.id 
      ORDER BY n.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching all notes:", err.message);
    res.status(500).json({ error: "Failed to fetch notes." });
  }
}

// Placeholders for missing functions
// ------------------ Generic Notification Helper ------------------
async function sendNotification(recipientId, title, message, type, refId, refUrl) {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (title, message, recipient_id, type, reference_id, reference_url) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [title, message, recipientId, type, refId, refUrl]
    );
    const notificationId = result.rows[0].id;

    // Also insert into user_notifications for read status tracking
    await pool.query(
      `INSERT INTO user_notifications (user_id, notification_id) VALUES ($1, $2)`,
      [recipientId, notificationId]
    );
    return notificationId;
  } catch (err) {
    console.error("❌ Error sending notification:", err);
  }
}



// ------------------ RATINGS ------------------
async function addNoteRating(req, res) {
  try {
    const { noteId } = req.params;
    const { rating, review_text } = req.body;
    const userId = req.user.id; // Rater

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5." });
    }

    await pool.query(
      `INSERT INTO note_ratings (note_id, user_id, rating, review_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (note_id, user_id) DO UPDATE SET rating = EXCLUDED.rating, review_text = EXCLUDED.review_text, created_at = NOW()`,
      [noteId, userId, rating, review_text]
    );

    // Notify Owner
    const note = await findNoteById(noteId);
    if (note && note.user_id !== userId) {
      const raterName = req.user.username || "A user";
      const reviewSnippet = review_text ? `"${review_text}"` : "No comment";

      // Notify Owner
      await sendNotification(
        note.user_id,
        `New Review from ${raterName}`,
        `${raterName} rated your note "${note.title}" ${rating}/5: ${reviewSnippet}`,
        'rating',
        noteId,
        `/notes/view/${noteId}`
      );
    }

    // Notify Admins
    const adminResult = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    const raterNameForAdmin = req.user.username || "A user";
    const reviewSnippetForAdmin = review_text ? `"${review_text}"` : "No comment";

    for (const admin of adminResult.rows) {
      // Don't notify the rater if they are an admin
      if (admin.id !== userId) {
        await sendNotification(
          admin.id,
          `New Review: ${note.title}`,
          `${raterNameForAdmin} rated "${note.title}" ${rating}/5: ${reviewSnippetForAdmin}`,
          'rating_admin',
          noteId,
          `/notes/view/${noteId}`
        );
      }
    }

    res.json({ message: "Rating submitted." });
  } catch (err) {
    console.error("Error adding rating:", err);
    res.status(500).json({ error: "Failed to submit rating." });
  }
}

async function requestNoteAccess(req, res) {
  try {
    const { noteId } = req.params;
    const requesterId = req.user.id;

    const note = await findNoteById(noteId);
    if (!note) return res.status(404).json({ error: "Note not found" });
    if (note.user_id === requesterId) return res.status(400).json({ error: "You own this note." });

    await pool.query(
      `INSERT INTO note_access_permissions (note_id, owner_id, requester_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (note_id, requester_id) DO NOTHING`,
      [noteId, note.user_id, requesterId]
    );

    // Notify Owner
    await sendNotification(
      note.user_id,
      "Access Request",
      `${req.user.name || 'A user'} requested access to "${note.title}".`,
      'access_request',
      noteId,
      '/approval-requests'
    );

    res.json({ message: "Access request sent." });
  } catch (err) {
    console.error("Error requesting access:", err);
    res.status(500).json({ error: "Failed to request access." });
  }
}

async function getAccessRequests(req, res) {
  try {
    const userId = req.user.id;

    // Fetch requests for notes owned by the current user
    const query = `
      SELECT 
        nap.id,
        nap.status,
        nap.created_at,
        n.title AS note_title,
        n.subject AS note_subject,
        n.id AS note_id,
        u.username AS requester_username,
        u.name AS requester_name,
        u.id AS requester_id
      FROM note_access_permissions nap
      JOIN notes n ON nap.note_id = n.id
      JOIN users u ON nap.requester_id = u.id
      WHERE nap.owner_id = $1 
      ORDER BY nap.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching access requests:", err);
    res.status(500).json({ error: "Failed to fetch access requests." });
  }
}

async function respondToAccessRequest(req, res) {
  try {
    const { requestId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    const ownerId = req.user.id;

    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: "Invalid status" });

    const result = await pool.query(
      `UPDATE note_access_permissions SET status = $1 WHERE id = $2 AND owner_id = $3 RETURNING *`,
      [status, requestId, ownerId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "Request not found or unauthorized." });

    const request = result.rows[0];
    const note = await findNoteById(request.note_id);

    // Notify Requester
    await sendNotification(
      request.requester_id,
      `Access ${status === 'approved' ? 'Granted' : 'Denied'}`,
      `Your request to access "${note ? note.title : 'a note'}" was ${status}.`,
      'general',
      request.note_id,
      `/notes/view/${request.note_id}`
    );

    res.json({ message: `Request ${status}.` });
  } catch (err) {
    console.error("Error responding to access request:", err);
    res.status(500).json({ error: "Failed to process request." });
  }
}

async function getSharedNotes(req, res) {
  try {
    const userId = req.user.id;

    // Fetch notes where the current user is the requester and status is 'approved'
    const query = `
      SELECT 
        n.*, 
        u.username AS owner_username,
        nap.created_at AS shared_at
      FROM note_access_permissions nap
      JOIN notes n ON nap.note_id = n.id
      JOIN users u ON n.user_id = u.id
      WHERE nap.requester_id = $1 
        AND nap.status = 'approved'
      ORDER BY nap.created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching shared notes:", err.message);
    res.status(500).json({ error: "Failed to fetch shared notes." });
  }
}
async function getMyNotes(req, res) {
  try {
    const userId = req.user ? req.user.id : null;
    if (!userId) {
      return res.status(401).json({ error: "User ID missing from request." });
    }

    // SAFE QUERY: Explicit columns that definitely exist
    // We omit 'is_free' just to be 100% safe for now, we can add it later
    const notesResult = await pool.query(`
      SELECT 
        id, title, subject, created_at, approval_status, view_count, 
        file_url, pdf_path, rejection_reason,
        university_name, course, field, material_type, state,
        deletion_requested, deletion_reason
      FROM notes 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [userId]);

    const notes = notesResult.rows;

    const stats = {
      total: notes.length,
      approved: notes.filter(n => n.approval_status === 'approved').length,
      pending: notes.filter(n => n.approval_status === 'pending').length,
      rejected: notes.filter(n => n.approval_status === 'rejected').length,
      totalViews: notes.reduce((sum, n) => sum + (parseInt(n.view_count) || 0), 0)
    };

    res.json({ stats, notes });
  } catch (err) {
    console.error("Error fetching my notes:", err);
    res.status(500).json({ error: "Failed to fetch notes.", details: err.message });
  }
}


// ----------------- Ratings placeholders -----------------

async function getNoteRatings(req, res) {
  try {
    const { noteId } = req.params;
    const result = await pool.query(`
      SELECT nr.rating, nr.review_text, nr.created_at, u.username 
      FROM note_ratings nr
      JOIN users u ON nr.user_id = u.id
      WHERE nr.note_id = $1
      ORDER BY nr.created_at DESC
    `, [noteId]);

    // Calculate average
    const ratings = result.rows;
    const average = ratings.length > 0
      ? (ratings.reduce((acc, r) => acc + Number(r.rating), 0) / ratings.length).toFixed(1)
      : 0;

    res.json({ average, ratings });
  } catch (err) {
    console.error("Error fetching ratings:", err);
    res.status(500).json({ error: "Failed to fetch ratings." });
  }
}



async function getDeleteRequests(req, res) {
  try {
    const result = await pool.query(`
      SELECT n.id, n.title, n.created_at, n.deletion_reason, u.username
      FROM notes n
      JOIN users u ON n.user_id = u.id
      WHERE n.deletion_requested = TRUE
      ORDER BY n.created_at ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching delete requests:", err);
    res.status(500).json({ error: "Failed to fetch requests." });
  }
}

async function reviewDeleteRequest(req, res) {
  try {
    const { noteId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    if (action === 'reject') {
      await pool.query("UPDATE notes SET deletion_requested = FALSE, deletion_reason = NULL WHERE id = $1", [noteId]);
      return res.json({ message: "Deletion request rejected." });
    } else if (action === 'approve') {
      const note = await findNoteById(noteId);
      if (!note) return res.status(404).json({ error: "Note not found" });

      // Cleanup files
      if (note.cloudinary_public_id) {
        await cloudinary.uploader.destroy(note.cloudinary_public_id, { resource_type: 'raw' });
      } else if (note.pdf_path) {
        const filePath = path.join(__dirname, '..', '..', 'uploads', path.basename(note.pdf_path));
        await fs.unlink(filePath).catch(err => console.error("Failed to delete file:", err.message));
      }

      await deleteNote(noteId);
      return res.json({ message: "Note deleted successfully." });
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }
  } catch (err) {
    console.error("Error reviewing delete request:", err);
    res.status(500).json({ error: "Failed to process request." });
  }
}

module.exports = {
  uploadUserNote,
  handleMultiUpload,
  getFilteredNotes,
  getAvailableSubjects,
  getFreeNote,
  getMyNotes,
  deleteMyNotes,
  getSingleNote,
  serveNoteWithWatermark,
  editNote,
  removeNote,
  getAllNotes,
  getPendingNotes,
  reviewNote,
  addNoteRating,
  getNoteRatings,
  getAccessRequests,
  requestNoteAccess,
  respondToAccessRequest,
  getSharedNotes,
  getFavouriteIds,
  getFavourites,
  addFavourite,
  removeFavourite,
  reportNote,
  getDeleteRequests,
  reviewDeleteRequest,
  uploadMiddleware // Exported for use in routes
};