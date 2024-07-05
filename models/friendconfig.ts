import mongoose from "mongoose"

export const friendConfigSchama = new mongoose.Schema({
  userid: {
    type: String,
    required: true,
    unique: true,
  },
  addFriendById: {
    type: Boolean,
    required: true,
  },
  blockUsers: [String],
  allowOtherServerUsers: {
    type: Boolean,
    required: true,
  },
})
const friendConfig = mongoose.model("friendconfig", friendConfigSchama)
export default friendConfig