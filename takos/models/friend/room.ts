import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
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
