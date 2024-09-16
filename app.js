import express from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import router from './routes/api.js';
import Message from './models/Message.js';
 
const app = express();
const PORT = process.env.PORT
const server = createServer(app);
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
  res.send("Hello world");
});
 
// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected');
 
  socket.on('join-room', async (finalroom) => {
    socket.join(finalroom);
    
    try {
      const messages = await Message.find({ finalroom }).sort({ createdAt: 1 });
      const serializedMessages = messages.map(msg => {
        const serialized = msg.toObject();
        if (serialized.createdAt) {
          serialized.createdAt = serialized.createdAt.toISOString();
        }
        
        return serialized;
      });
      socket.emit('messageHistory', serializedMessages);
    } catch (error) {
      console.error('Error fetching message history:', error);
      socket.emit('error', 'Failed to fetch message history');
    }
  });
 
  socket.on('message', async ({ appId, finalroom, user, message }) => {
    const newMessage = new Message({ appId, finalroom, user, message });
    await newMessage.save();
    const serializedMessage = newMessage.toObject();
    if (serializedMessage.createdAt) {
      serializedMessage.createdAt = serializedMessage.createdAt.toISOString();
    }

    io.to(finalroom).emit('receive-message', serializedMessage);
  });

  socket.on("delete-message", async ({ messageId, room }) => {
    try {
      // Find the message to be deleted from database
      const message = await Message.findOne({ _id: messageId });
      if (message) {
        await Message.deleteOne({ _id: messageId });
        io.to(room).emit("message-deleted", { messageId });
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  });

  socket.on("edit-message", async ({ messageId, newContent, room }) => {
   
    
    try {
      //find the message to be edited
      const message = await Message.findOne({ _id: messageId });
      if (message) {
        message.message = newContent;
        await message.save();
        io.to(room).emit("message-edited", { messageId, newContent });
      }
    } catch (err) {
      console.error("Error editing message:", err);
    }
  });

  socket.on("react-to-message", async ({ messageId, emoji, user, room }) => {
    try {
      const message = await Message.findOne({ _id: messageId });
      if (message) {
        // Handle reactions
        const existingReaction = message.reactions.find(
          (reaction) => reaction.user === user && reaction.emoji === emoji
        );
 
        if (existingReaction) {
          message.reactions = message.reactions.filter(
            (reaction) =>
              !(reaction.user === user && reaction.emoji === emoji)
          );
        } else {
          message.reactions.push({ emoji, user });
        }
 
        await message.save();
        io.to(room).emit("message-reaction", { messageId, reactions: message.reactions });
      }
    } catch (err) {
      console.error("Error reacting to message:", err);
    }
  });

 
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});
 
server.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
