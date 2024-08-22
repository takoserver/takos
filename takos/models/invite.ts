import mongoose from "mongoose";
const inviteSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  invitedBy: {
    type: String,
    required: true,
  },
  invitedUser: {
    type: String,
    required: true,
  },
  inviteRoom: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
});
