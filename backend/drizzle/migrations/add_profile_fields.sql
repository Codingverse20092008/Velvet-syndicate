-- Migration: Add profile fields to users table
-- Date: 2026-04-27

-- Add phone column
ALTER TABLE users ADD COLUMN phone TEXT;

-- Add address column
ALTER TABLE users ADD COLUMN address TEXT;

-- Add avatar column
ALTER TABLE users ADD COLUMN avatar TEXT;

-- Create unique index on phone
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_idx ON users(phone);
