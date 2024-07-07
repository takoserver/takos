import mongoose from "mongoose"

export const CommunitiesSchama = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  timestamp: { type: Date, default: Date.now },
})
const csrfToken = mongoose.model("communities", CommunitiesSchama)
export default csrfToken
