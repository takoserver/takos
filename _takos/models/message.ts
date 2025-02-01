import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  messageid: {
    type: String,
    required: true,
  },
  isLocal: {
    type: Boolean,
    required: true,
  },
  userid: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["friend", "group"],
  },
  roomid: {
    type: String,
  },
  message: {
    type: String,
  },
  sign: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  read: {
    type: Array,
  },
  roomKeyHash: {
    type: String,
  },
});

export default mongoose.model("Message", messageSchema);
