-- Comprehensive Database Fix Script
-- Run this in your Neon SQL Editor to fix missing tables and columns.

-- 1. Ensure Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Ensure Tables Exist (Core Tables)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(50) UNIQUE,
    mobile_number VARCHAR(255) UNIQUE,
    is_mobile_verified BOOLEAN DEFAULT FALSE,
    badges TEXT[] DEFAULT ARRAY[]::TEXT[],
    free_views INTEGER DEFAULT 0,
    subscription_expiry TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    registration_ip VARCHAR(45),
    totp_secret VARCHAR(255),
    reset_token TEXT,
    reset_token_expires TIMESTAMPTZ,
    google_id VARCHAR(255),
    github_id VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    pdf_path TEXT,
    file_url TEXT,
    cloudinary_public_id TEXT,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    material_type VARCHAR(50) NOT NULL,
    institution_type VARCHAR(100),
    field VARCHAR(100),
    course VARCHAR(100),
    subject VARCHAR(100),
    university_name VARCHAR(150),
    approval_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    is_free BOOLEAN DEFAULT FALSE,
    state VARCHAR(100),
    expiry_date DATE
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ensure Aux Tables Exist (often missing)
CREATE TABLE IF NOT EXISTS user_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    notification_id INTEGER REFERENCES notifications(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suggestions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    admin_reply TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    replied_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS note_reports (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255) NOT NULL,
    comment TEXT,
    status VARCHAR(20) DEFAULT 'new' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (note_id, reporter_id)
);

CREATE TABLE IF NOT EXISTS user_favourites (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, note_id)
);

CREATE TABLE IF NOT EXISTS user_views (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, note_id)
);

CREATE TABLE IF NOT EXISTS note_ratings (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (note_id, user_id)
);

CREATE TABLE IF NOT EXISTS note_access_permissions (
    id SERIAL PRIMARY KEY,
    note_id INTEGER NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (note_id, requester_id)
);

CREATE TABLE IF NOT EXISTS pending_registrations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL,
    mobile_number VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user',
    otp VARCHAR(6) NOT NULL,
    otp_created_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes')
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    revoked BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS otps (
    email VARCHAR(255) PRIMARY KEY,
    otp VARCHAR(6) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Apply Column Fixes (The most common cause of 500 errors)

-- Fixes for 'notes' table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS deletion_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Fixes for 'users' table
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS school_college VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS semester VARCHAR(50);

-- Fixes for 'notifications' table
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id INTEGER;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_url TEXT;

-- 5. Insert Default Settings (if missing)
INSERT INTO app_settings (setting_key, setting_value) 
VALUES ('is_subscription_enabled', 'false') -- Stored as text usually in your controller logic
ON CONFLICT (setting_key) DO NOTHING;

-- 6. Insert Default Admin (Optional, safe to run)
INSERT INTO users (name, email, password, role, is_verified, username, is_mobile_verified)
VALUES (
    'Admin User', 
    'admin@example.com', 
    '$2b$10$YourHashedPasswordHere', -- Replace if you want a specific default
    'admin', 
    TRUE, 
    'admin', 
    TRUE
) ON CONFLICT (email) DO NOTHING;
