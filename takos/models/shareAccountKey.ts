import mongoose from "mongoose";

const keyShareDataSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  hash: {
    type: String,
    required: true,
  },
  encryptedAccountKey: {
    type: Array,
  },
  deriveredSession: {
    type: Array,
    default: [],
  },
  updateTime: {
    type: Date,
    expires: 60 * 60 * 24 * 14,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const KeyShareData = mongoose.model("accountKeyShare", keyShareDataSchema);

export default KeyShareData;
