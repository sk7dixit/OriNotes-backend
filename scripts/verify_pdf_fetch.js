const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fetch = require('node-fetch');
const fs = require('fs').promises;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
});

async function verify() {
    try {
        console.log("🔍 Finding a note with Cloudinary URL...");
        const res = await pool.query("SELECT * FROM notes WHERE file_url IS NOT NULL LIMIT 1");

        let note;
        let isLocal = false;

        if (res.rows.length === 0) {
            console.log("⚠️ No notes with file_url found. Trying local path...");
            const resLocal = await pool.query("SELECT * FROM notes WHERE pdf_path IS NOT NULL LIMIT 1");
            if (resLocal.rows.length === 0) {
                console.log("❌ No notes found at all.");
                return;
            }
            note = resLocal.rows[0];
            isLocal = true;
            console.log(`✅ Found Local Note: ${note.title} (ID: ${note.id})`);
            console.log(`📂 PDF Path in DB: ${note.pdf_path}`);
        } else {
            note = res.rows[0];
            console.log(`✅ Found Cloudinary Note: ${note.title} (ID: ${note.id})`);
            console.log(`🔗 URL: ${note.file_url}`);
        }

        let buffer;
        if (isLocal) {
            const notePath = path.join(__dirname, '..', 'uploads', path.basename(note.pdf_path));
            console.log(`📂 Resolving to: ${notePath}`);
            console.log("⬇️ Reading local file...");
            buffer = await fs.readFile(notePath);
        } else {
            console.log("⬇️ Fetching PDF...");
            const response = await fetch(note.file_url);
            if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
            const arrayBuffer = await response.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
        }

        console.log(`📦 Got ${buffer.length} bytes.`);

        console.log("📄 Loading into pdf-lib...");
        const pdfDoc = await PDFDocument.load(buffer);
        console.log(`✅ PDF Loaded. Pages: ${pdfDoc.getPageCount()}`);

        console.log("🖋️ Embedding font...");
        await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        console.log("✅ Font embedded.");

        const savedBytes = await pdfDoc.save();
        console.log(`✅ PDF Processed. Size: ${savedBytes.length} bytes.`);
        console.log("--------------------------------------------------");
        console.log("🎉 VERIFICATION SUCCESSFUL");
        console.log("--------------------------------------------------");

    } catch (err) {
        console.error("❌ Verification Failed:", err.message);
    } finally {
        pool.end();
    }
}

verify();
