import mongoose from "mongoose";

const keyShareDataSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  accoutKey: {
    type: String,
    required: true,
  },
  sign: {
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
});

const KeyShareData = mongoose.model("accountKey", keyShareDataSchema);

export default KeyShareData;
