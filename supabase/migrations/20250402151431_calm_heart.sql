/*
  # Create chat tables and real-time functionality

  1. New Tables
    - `chat_users`
      - `id` (uuid, primary key)
      - `username` (text, unique)
      - `last_seen` (timestamp)
      - `created_at` (timestamp)
    - `messages`
      - `id` (uuid, primary key)
      - `content` (text)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to:
      - Read all messages
      - Insert their own messages
      - Read all users
      - Update their own user data
*/

-- Create chat_users table
CREATE TABLE IF NOT EXISTS chat_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_id uuid REFERENCES chat_users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_users
CREATE POLICY "Allow users to read all users"
  ON chat_users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to update their own data"
  ON chat_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policies for messages
CREATE POLICY "Allow users to read all messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to insert their own messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);