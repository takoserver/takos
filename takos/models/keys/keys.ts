//AccountKey module
import mongoose from "mongoose"
import type { AccountKeyPub, IdentityKeyPub } from "takosEncryptInk"

const accountKeySchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  identityKeyPub: {
    type: Object,
    required: true,
  },
  accountKeyPub: {
    type: Object,
    required: true,
  },
  hashHex: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  encryptedIdentityKey: {
    type: [{
      key: {
        type: Object,
        required: true,
      },
      sessionid: {
        type: String,
        required: true,
      },
    }],
    required: true,
    default: [],
  },
  encryptedAccountKey: {
    type: [{
      key: {
        type: Object,
        required: true,
      },
      sessionid: {
        type: String,
        required: true,
      },
    }],
    required: true,
    default: [],
  },
})
const AccountKey = mongoose.model("keys", accountKeySchema)
export default AccountKey
