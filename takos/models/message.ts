import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["friend", "group"],
  },
  roomid: {
    type: String,
  },
  friend: {
    type: [String, String],
  },
  message: {
    type: String,
    required: true,
  },
  sign: {
    type: String,
    required: true,
  },
  roomKeyhash: {
    type: String,
    required: true,
  },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.model("Message", messageSchema);