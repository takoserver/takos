import mongoose from "mongoose";

const keyShareDataSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  userName: {
    type: String,
    required: true,
  },
  sessionid: {
    type: String,
    required: true,
  },
  EncryptedDataKeyShareKey: {
    type: [[String]], // 修正: 二次元配列に変更
    required: true,
  },
  keyShareSign: {
    type: String,
    required: true,
  },
  deriveredSession: {
    type: [String],
    required: true,
  },
  timestamp: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
  type: {
    type: String,
    enum: ["key", "allowKey"],
    required: true,
  },
});

const KeyShareData = mongoose.model("keyShareData", keyShareDataSchema);

export default KeyShareData;
