//AccountKey module
import mongoose from "mongoose";
const accountKeySchema = new mongoose.Schema({
    uuid: {
        type: String,
        required: true,
        unique: true,
    },
    accountKey: {
        type: Object,
    },
    timestamp: { type: Date, default: Date.now },
    hashHex: {
        type: String,
    },
});
const AccountKey = mongoose.model("accountKey", accountKeySchema);
export default AccountKey;