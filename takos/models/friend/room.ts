import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  members: {
    type: [String],
    required: true,
  },
  roomid: {
    type: String,
    required: true,
  },
});

export default mongoose.model("friendRoom", roomSchema);
