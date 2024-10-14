import mongoose from "mongoose"

const masterKeySchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  masterKey: {
    type: Object,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  hashHex: {
    type: String,
    required: true,
  },
})
const MasterKey = mongoose.model("masterKey", masterKeySchema)
export default MasterKey
