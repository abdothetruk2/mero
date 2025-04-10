/*
  # Add admin functionality to chat users

  1. Changes
    - Add is_admin column to chat_users table
    - Add default admin user
    - Update RLS policies for admin access

  2. Security
    - Maintain existing RLS
    - Add admin-specific permissions
*/

-- Add is_admin column to chat_users
ALTER TABLE chat_users
ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create default admin user if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM chat_users 
    WHERE username = 'admin'
  ) THEN
    INSERT INTO chat_users (username, is_admin)
    VALUES ('admin', true);
  END IF;
END $$;

-- Update RLS policies for admin access
CREATE POLICY "Allow admins full access to chat_rooms"
  ON chat_rooms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_users
      WHERE chat_users.id = auth.uid()
      AND chat_users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_users
      WHERE chat_users.id = auth.uid()
      AND chat_users.is_admin = true
    )
  );