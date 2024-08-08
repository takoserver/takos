import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
  uuid: {
    type: String,
    required: true,
    unique: true,
  },
  userName: {
    type: String,
    required: true,
    unique: true,
  },
  nickName: {
    type: String,
  },
  password: {
    type: String,
    required: true,
  },
  salt: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (v: string) {
        return /^[\w-]+@[\w-]+\.[a-z]{2,3}$/.test(v);
      },
      message: (props: { value: any }) =>
        `${props.value} is not a valid mail address!`,
    },
  },
  setup: {
    type: Boolean,
    default: false,
  },
  age: {
    type: Number,
  },
  timestamp: { type: Date, default: Date.now },
  accountKey: {
    type: String,
  },
  deviceKey: {
    type: String,
  },
});
const User = mongoose.model("user", userSchema);
export default User;
