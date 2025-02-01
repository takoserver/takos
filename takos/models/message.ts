import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  messageid: {
    type: String,
    required: true,
  },
  isEncrypted: {
    type: Boolean,
    required: true,
  },
  isSigned: {
    type: Boolean,
    required: true,
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
  },
});

const Message = mongoose.model("message", messageSchema);

export default Message;
