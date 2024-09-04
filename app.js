// backend/server.js
import express from 'express';
import { createServer } from 'http';  // Corrected import
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import router from './routes/api.js';
import Message from './models/Message.js';

const app = express();
const PORT= process.env.PORT
const server = createServer(app);  // Use the correct createServer function
const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

// Connect to MongoDB
connectDB();

app.use(express.json());
app.use('/api', router);

app.get("/", (req, res) => {
  res.send("HEllo world"); //response for the root url
});
// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join', ({ appId }) => {
    socket.join(appId);
    console.log(`User joined room: ${appId}`);
  });

  socket.on('message', async ({ appId, message }) => {
    const newMessage = new Message({ appId, message });
    await newMessage.save();
    io.to(appId).emit('message', newMessage);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => {
  console.log('Server running on port '+ PORT);
});
