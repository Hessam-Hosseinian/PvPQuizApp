-- Migration: Add avatar column to users table
-- Run this script to add avatar support to existing databases

-- Add avatar column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'avatar'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar VARCHAR(255);
    END IF;
END $$;

-- Create index for avatar lookups
CREATE INDEX IF NOT EXISTS idx_users_avatar ON users(avatar) WHERE avatar IS NOT NULL; 