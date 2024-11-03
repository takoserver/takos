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
  accountKey: {
    type: String,
    required: true,
  },
  keyHash: {
    type: String,
    required: true,
  },
  timestamp: {
    type: String,
  },
});

const Key = mongoose.model("keys", keySchema);
export default Key;
