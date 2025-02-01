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
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  sessionid: {
    type: String,
  },
});

const KeyShareData = mongoose.model("accountKeyShare", keyShareDataSchema);

export default KeyShareData;
