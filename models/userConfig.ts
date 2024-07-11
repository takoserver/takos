import mongoose from "mongoose";

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
  blockUsers: {
    type: [String],
    required: true,
    validate: {
      validator: function (v: string[]) {
        const unique = new Set(v);
        return unique.size === v.length;
      },
      message: (props: { value: any }) => `${props.value} contains duplicate entries!`,
    },
  },
  blockServers: {
    type: [String],
    required: true,
    validate: {
      validator: function (v: string[]) {
        const unique = new Set(v);
        return unique.size === v.length;
      },
      message: (props: { value: any }) => `${props.value} contains duplicate entries!`,
    },
  },
  allowOtherServerUsers: {
    type: Boolean,
    required: true,
  },
});
const friendConfig = mongoose.model("friendconfig", friendConfigSchama);
export default friendConfig;
