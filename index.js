import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cor
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configure CORS before other middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json());

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for SPA routes (excluding API and Socket.IO)
app.get('*', (req, res, next) => {
  const isApi = req.path.startsWith('/api/');
  const isSocket = req.path.startsWith('/socket.io/');
  if (isApi || isSocket) return next();
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Create HTTP server and attach Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Heartbeat endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get all rooms
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

// Get all messages
app.get('/api/messages', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        user:chat_users!messages_sender_fkey(username, avatar_url),
        message_reactions(
          id,
          emoji,
          user_id,
          chat_users(username)
        )
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

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle joining chat
  socket.on('join', async (username) => {
    try {
      const { data, error } = await supabase
        .from('chat_users')
        .upsert({
          username,
          last_seen: new Date().toISOString(),
        }, {
          onConflict: 'username',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) {
        const newUsername = `${username}_${Math.random().toString(36).substring(2, 5)}`;
        const { data: newUser, error: retryError } = await supabase
          .from('chat_users')
          .insert([{ username: newUsername, last_seen: new Date().toISOString() }])
          .select()
          .single();

        if (retryError) throw retryError;
        socket.username = newUsername;
        socket.userId = newUser.id;
        io.emit('user_joined', newUser);
        return;
      }

      socket.username = data.username;
      socket.userId = data.id;
      io.emit('user_joined', data);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  // Handle chat messages
  socket.on('chat_message', async (message) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ content: message, user_id: socket.userId })
        .select(`
          *,
          user:chat_users!messages_sender_fkey(username, avatar_url)
        `)
        .single();

      if (error) throw error;
      io.emit('new_message', data);
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  // Handle user disconnection
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

// Start server
const PORT = process.env.PORT || 80;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
