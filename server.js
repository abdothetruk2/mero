import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// Equivalent to __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Configure CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all chat rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all messages with user and reactions
app.get('/api/messages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        user:chat_users!messages_sender_fkey(username, avatar_url),
        message_reactions(id, emoji, user_id, chat_users(username))
      `)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_users')
      .select('*')
      .order('last_seen', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle socket connections
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins
  socket.on('join', async (username) => {
    try {
      let { data, error } = await supabase
        .from('chat_users')
        .upsert({ username, last_seen: new Date().toISOString() }, { onConflict: 'username' })
        .select()
        .single();

      if (error) {
        const newUsername = `${username}_${Math.random().toString(36).substring(2, 5)}`;
        const result = await supabase
          .from('chat_users')
          .insert([{ username: newUsername, last_seen: new Date().toISOString() }])
          .select()
          .single();

        if (result.error) throw result.error;
        data = result.data;
      }

      socket.username = data.username;
      socket.userId = data.id;
      io.emit('user_joined', data);

    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  // Handle incoming chat messages
  socket.on('chat_message', async (message) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ content: message, user_id: socket.userId })
        .select('*, user:chat_users!messages_sender_fkey(username, avatar_url)')
        .single();

      if (error) throw error;
      io.emit('new_message', data);

    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  // On disconnect, update last seen and notify others
  socket.on('disconnect', async () => {
    if (socket.userId) {
      try {
        await supabase
          .from('chat_users')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', socket.userId);

        io.emit('user_left', { userId: socket.userId });
      } catch (error) {
        console.error('Error updating last_seen:', error);
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Optionally export the app and server if needed
export { app, httpServer };

