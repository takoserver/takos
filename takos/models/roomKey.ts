import mongoose from "mongoose";

const roomKeySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  userName: {
    type: String,
    required: true,
  },
  roomid: {
    type: String,
    required: true,
  },
  roomType: {
    type: String,
    required: true,
    enum: ["friend", "group"],
  },
  encryptedRoomKey: {
    type: Array,
  },
  sessionid: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  roomKeySign: {
    type: String,
    required: true,
  },
  metaData: {
    type: String,
    required: true,
  },
  metaDataSign: {
    type: String,
    required: true,
  },
});

export default mongoose.model("RoomKey", roomKeySchema);
