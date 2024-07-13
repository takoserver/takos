import mongoose from "mongoose";

export const remoteFriendsSchema = new mongoose.Schema({
    uuid: {
        type: String,
        required: true,
        unique: true,
    },
    userName: {
        type: String,
        required: true,
    },
    nickName: {
        type: String,
    },
});
const friends = mongoose.model("remoteFriends", remoteFriendsSchema);
export default friends;
