import mongoose from "mongoose"
import type { AccountKeyPub, deviceKeyPub, IdentityKeyPub, MasterKeyPub } from "takosEncryptInk"
const userSchema = new mongoose.Schema({
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
        return /^[\w-]+@[\w-]+\.[a-z]{2,3}$/.test(v)
      },
      message: (props: { value: any }) => `${props.value} is not a valid mail address!`,
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
})
const User = mongoose.model("user", userSchema)
export default User
