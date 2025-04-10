/*
  # Add chat rooms and enhanced user features

  1. New Tables
    - `chat_rooms`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, references chat_users)
      - `is_private` (boolean)

    - `room_members`
      - `room_id` (uuid, references chat_rooms)
      - `user_id` (uuid, references chat_users)
      - `joined_at` (timestamp)

    - `message_reactions`
      - `id` (uuid, primary key)
      - `message_id` (uuid, references messages)
      - `user_id` (uuid, references chat_users)
      - `emoji` (text)
      - `created_at` (timestamp)

  2. Changes
    - Add avatar_url to chat_users
    - Add is_private and recipient_id to messages
    - Add room_id to messages

  3. Security
    - Enable RLS on all new tables
    - Add appropriate policies for public and private access
*/

-- Add avatar_url to chat_users
ALTER TABLE chat_users
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES chat_users(id),
  is_private boolean DEFAULT false
);

-- Create room_members table
CREATE TABLE IF NOT EXISTS room_members (
  room_id uuid REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES chat_users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES chat_users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add new columns to messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES chat_users(id),
ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES chat_rooms(id);

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for chat_rooms
CREATE POLICY "Allow anyone to read public rooms"
  ON chat_rooms
  FOR SELECT
  TO anon, authenticated
  USING (NOT is_private OR EXISTS (
    SELECT 1 FROM room_members
    WHERE room_members.room_id = chat_rooms.id
    AND room_members.user_id = auth.uid()
  ));

CREATE POLICY "Allow anyone to create rooms"
  ON chat_rooms
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policies for room_members
CREATE POLICY "Allow anyone to read room members"
  ON room_members
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anyone to join rooms"
  ON room_members
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policies for message_reactions
CREATE POLICY "Allow anyone to read reactions"
  ON message_reactions
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anyone to add reactions"
  ON message_reactions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);