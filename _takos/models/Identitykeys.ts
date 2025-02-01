import mongoose from "mongoose";

const keySchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  identityKey: {
    type: String,
    required: true,
  },
  sign: {
    type: String,
    required: true,
  },
  sessionid: {
    type: String,
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  hash: {
    type: String,
    required: true,
  },
});

const Key = mongoose.model("identityKeys", keySchema);
export default Key;
