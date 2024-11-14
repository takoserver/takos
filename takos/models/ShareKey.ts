import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  sessionid: {
    type: String,
    required: true,
  },
  ShareKey: {
    type: String,
    required: true,
  },
  sign: {
    type: String,
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
});

const Session = mongoose.model("keyShareKey", sessionSchema);

export default Session;
