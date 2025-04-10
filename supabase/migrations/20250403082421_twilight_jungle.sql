/*
  # Fix chat_users RLS policies for upsert operations

  1. Changes
    - Add policy for anonymous users to upsert into chat_users
    - Ensure policies allow both insert and update operations
    - Remove user-specific restrictions for basic chat functionality

  2. Security
    - Maintain RLS on chat_users table
    - Allow anonymous access for basic chat functionality
    - Enable upsert operations for user management
*/

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Allow anyone to read all users" ON chat_users;
DROP POLICY IF EXISTS "Allow anyone to insert users" ON chat_users;
DROP POLICY IF EXISTS "Allow users to update their own data" ON chat_users;

-- Create new policies that allow both authenticated and anonymous access
CREATE POLICY "Allow anyone to read all users"
  ON chat_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anyone to insert or update users"
  ON chat_users
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);