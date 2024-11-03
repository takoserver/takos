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
  deviceKey: {
    type: String,
    required: true,
  },
  keyShareKey: {
    type: String,
  },
  keyShareSignKey: {
    type: String,
  },
  keyShareSing: {
    type: String,
  },
  keyShareSignSing: {
    type: String,
  },
  timestamp: { type: Date, default: Date.now },
  encrypted: {
    type: Boolean,
    default: false,
  },
  sessionUUID: {
    type: String,
  },
});

const Session = mongoose.model("sessions", sessionSchema);

export default Session;
