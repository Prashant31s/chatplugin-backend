// backend/models/Message.js
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  appId: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('Message', MessageSchema);
