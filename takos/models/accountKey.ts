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
    type: [String, String],
  },
});

const KeyShareData = mongoose.model("keyShareData", keyShareDataSchema);

export default KeyShareData;
