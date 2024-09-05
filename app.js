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

  socket.on('join', async({ finalroom }) => {
    socket.join(finalroom);
    console.log(`User joined room: ${finalroom}`);
    try {
      const messages = await Message.find({ finalroom }).sort({ createdAt: 1 }); // Sort messages by creation date
      socket.emit('messageHistory', messages);
    } catch (error) {
      console.error('Error fetching message history:', error);
      socket.emit('error', 'Failed to fetch message history');
    }
  });

  socket.on('message', async ({ appId,finalroom,user, message }) => {
    const newMessage = new Message({ appId, finalroom,user,message });
    await newMessage.save();
    io.to(finalroom).emit('message', newMessage);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

server.listen(PORT, () => {
  console.log('Server running on port '+ PORT);
});
