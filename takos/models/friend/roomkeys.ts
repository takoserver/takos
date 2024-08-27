import mongoose from "mongoose";

const roomKeySchema = new mongoose.Schema({
  roomid: {
    type: String,
    required: true,
  },
  key: [
    {
      userId: {
        type: String,
        required: true,
      },
      key: {
        type: String,
        required: true,
      },
    },
  ],
});

export default mongoose.model("friendRoomKey", roomKeySchema);
