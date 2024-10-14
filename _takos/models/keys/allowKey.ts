import mongoose from "mongoose"

const allowKeySchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    required: true,
  },
  keyHashHex: {
    type: String,
    required: true,
  },
  sign: {
    type: Object,
    required: true,
  },
  deliveryedSessionId: {
    type: [String], // 配列の型を指定
    required: true,
    default: [],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    required: true,
  },
})

const AllowKey = mongoose.model("AllowKey", allowKeySchema)
export default AllowKey
