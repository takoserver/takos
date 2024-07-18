import mongoose from "mongoose";
export const roomsSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
  },
  showName: {
    type: String,
    default: "",
  },
  types: {
    type: String,
    required: true,
    enum: ["group", "friend", "community", "remotefriend"],
  },
  users: {
    type: [
      {
        userid: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["local", "other"],
        },
        readedMessageCount: {
          type: Number,
          default: 0,
        },
      },
    ],
    required: true,
    default: [],
  },
  readInfo: {
    type: Map,
    required: true,
    default: {},
  },
  timestamp: { type: Date, default: Date.now },
});
const rooms = mongoose.model("rooms", roomsSchema);
export default rooms;
