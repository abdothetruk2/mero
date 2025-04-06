/*
  # Fix messages table RLS policies

  1. Changes
    - Add policy for anonymous users to insert messages
    - Add policy for anonymous users to read messages
    - Ensure messages can be created and read by all users

  2. Security
    - Maintain RLS on messages table
    - Allow anonymous access for basic chat functionality
    - Messages are public and readable by everyone
*/

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Allow users to insert their own messages" ON messages;
DROP POLICY IF EXISTS "Allow users to read all messages" ON messages;

-- Create new policies that allow both authenticated and anonymous access
CREATE POLICY "Allow anyone to read all messages"
  ON messages
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anyone to insert messages"
  ON messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);