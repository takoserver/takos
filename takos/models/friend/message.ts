import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  roomid: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  messageObj: {
    type: Object,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
  messageid: {
    type: String,
    required: true,
  },
  roomKeyHashHex: {
    type: String,
    required: true,
  },
});

export default mongoose.model("friendMessage", messageSchema);
