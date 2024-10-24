import mongoose from "mongoose";

const keyShareDataSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
    },
    sessionid: {
        type: String,
        required: true,
    },
    EncryptedDataKeyShareKey: {
        type: String,
        required: true,
    },
    Sign: {
        type: String,
        required: true,
    },
    timestamp: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

const KeyShareData = mongoose.model("keyShareData", keyShareDataSchema);

export default KeyShareData;