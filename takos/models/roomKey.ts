import mongoose from "mongoose";

const roomKeySchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
    },
    roomKey: {
        type: [[String]],
        required: true,
    },
    roomKeyhash: {
        type: String,
        required: true,
    },
    roomid: {
        type: String,
    },
    roomType: {
        type: String,
        required: true,
        enum: ["friend", "group"],
    },
    timestamp: {
        type: String,
        required: true,
    },
});

export default mongoose.model("RoomKey", roomKeySchema);