-- Add the is_read column to the chat_messages table
ALTER TABLE chat_messages
ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE; 