import mongoose from "mongoose"
import { timestamp } from "ui7"

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
        type: Object,
        required: true,
      },
    },
  ],
  keyHashHex: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: new Date(),
  },
})

export default mongoose.model("friendRoomKey", roomKeySchema)
