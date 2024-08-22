//AccountKey module
import mongoose from "mongoose";
import type { AccountKeyPub, IdentityKeyPub } from "takosEncryptInk";

const accountKeySchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    unique: true,
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
    type: [Object],
    required: true,
  },
  encryptedAccountKey: {
    type: [Object],
    required: true,
  },
});
const AccountKey = mongoose.model("keys", accountKeySchema);
export default AccountKey;
