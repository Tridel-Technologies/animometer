const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { connectDB, pool } = require('./db/db');
const router = require('./router/windDataROute');
const userRoutes = require('./router/userRoutes');
const configRoutes = require('./router/configRoutes');
const port = 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Routes
app.use('/api/', router);
app.use('/api/', userRoutes);
app.use('/api/', configRoutes);

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// PostgreSQL Listen for live updates
const setupPGListener = async () => {
  try {
    const client = await pool.connect();
    await client.query('LISTEN wind_data_updated');
    console.log('Listening for PostgreSQL notifications on channel: wind_data_updated');

    client.on('notification', (msg) => {
      if (msg.channel === 'wind_data_updated') {
        const payload = JSON.parse(msg.payload);
        console.log('Pushing live wind update:', payload.id);
        io.emit('wind_data_update', payload);
      }
    });

    client.on('error', (err) => {
      console.error('PG Client Error in Listener:', err);
      // Re-setup on error
      setTimeout(setupPGListener, 5000);
    });

  } catch (err) {
    console.error('Error setting up PG listener:', err);
    setTimeout(setupPGListener, 5000);
  }
};

// Initialize
const startServer = async () => {
  await connectDB();
  await setupPGListener();

  server.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`WebSocket server initialized`);
  });
};

startServer();
