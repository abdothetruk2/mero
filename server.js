 require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();

// Configure CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

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
      .select(`*,
        user:chat_users!messages_sender_fkey(username, avatar_url),
        message_reactions(id, emoji, user_id, chat_users(username))`
      )
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

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

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

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
