import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname } from 'path';
import path from 'path';
dotenv.config();

const app = express();

// Configure CORS before other middleware
app.use(cors({
  origin: "*",
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());
app.use(express.static('dist'));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin:"*",
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
      // Try to upsert the user with the given username
      const { data, error } = await supabase
        .from('chat_users')
        .upsert({ 
          username,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'username',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        // If there's a conflict, generate a new unique username
        const newUsername = `${username}_${Math.random().toString(36).substring(2, 5)}`;
        const { data: newUser, error: retryError } = await supabase
          .from('chat_users')
          .insert([{ 
            username: newUsername,
            last_seen: new Date().toISOString()
          }])
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
        .insert({
          content: message,
          user_id: socket.userId
        })
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
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
