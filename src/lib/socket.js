import { io } from 'socket.io-client';

const SOCKET_URL = "https://fly-patient-firefly-4760-production.up.railway.app"

export const socket = io('http://127.0.0.1:80', {
  path: '/socket.io/',
  transports: ['websocket','polling'],
  upgrade: true,
  secure: true
});

export const connectSocket = (username) => {
  if (!socket.connected) {
    socket.connect();
    socket.emit('join', username);
  }
};


export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

// Socket event listeners
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('error', (error) => {
  console.error('Socket error:', error);
});
