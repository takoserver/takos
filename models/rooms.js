import { mongoose } from "mongoose";

export const roomsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return /^[a-zA-Z0-9-_]{4,16}$/.test(v);
      },
      message: (props) => `${props.value} is not a valid room name!`,
    },
  },
  types: {
    type: String,
    required: true,
    enum: ["group", "friend", "public"],
  },
  users: {
    type: Array,
    required: true,
    default: [],
  },
  latestmessage: {
    type: String,
    required: true,
    default: "",
  },
  latestMessageTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  timestamp: { type: Date, default: Date.now },
});
const rooms = mongoose.model("rooms", roomsSchema);
export default rooms;
