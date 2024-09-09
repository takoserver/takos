import mongoose from "mongoose"

const Schema = new mongoose.Schema({
    userName: {
      type: String,
      required: true,
    },
    friendId: {
        type: String,
        required: true,
    },
    masterKeyPubHash: {
        type: String,
        required: true,
    },
    signedMasterKeyHash: {
        type: String,
        required: true,
    },
    sign: {
        type: String,
        required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
});

export default mongoose.model("allowFriendMasterKey", Schema);