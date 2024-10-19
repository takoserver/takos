import mongoose from "mongoose";
const userConfigSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  addFriendById: {
    type: Boolean,
    required: true,
    default: true,
  },
  blockUsers: {
    type: [String],
    required: true,
    default: [],
  },
  blockServers: {
    type: [String],
    required: true,
    default: [],
  },
  allowOtherServerUsers: {
    type: Boolean,
    required: true,
    default: true,
  },
});
const UserConfig = mongoose.model("userConfig", userConfigSchema);
export default UserConfig;
