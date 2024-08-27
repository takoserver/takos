import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  roomid: {
    type: String,
    required: true,
  },
  sender: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  sign: {
    type: String,
    required: true,
  },
  keyHashHex: {
    type: String,
    required: true,
  },
});

export default mongoose.model("friendMessage", messageSchema);
