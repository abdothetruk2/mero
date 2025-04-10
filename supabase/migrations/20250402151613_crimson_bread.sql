/*
  # Fix chat_users table RLS policies

  1. Changes
    - Add policy for anonymous users to insert into chat_users
    - Add policy for anonymous users to read chat_users
    - Add policy for anonymous users to update their own data

  2. Security
    - Maintain RLS on chat_users table
    - Allow anonymous access for basic chat functionality
    - Restrict updates to own user data only
*/

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Allow users to read all users" ON chat_users;
DROP POLICY IF EXISTS "Allow users to update their own data" ON chat_users;

-- Create new policies that allow both authenticated and anonymous access
CREATE POLICY "Allow anyone to read all users"
  ON chat_users
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anyone to insert users"
  ON chat_users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow users to update their own data"
  ON chat_users
  FOR UPDATE
  TO anon, authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());