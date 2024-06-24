import mongoose from "mongoose"

export const friendsSchema = new mongoose.Schema({
    imageId: {
        type: String,
        required: true,
    },
    userId: {
        type: String,
        required: true,
    },
    roomids: [String],
    size : {
        type: Number,
        required: true,
    },
    time : {
        type: Date,
        required: true,
        default: Date.now
    },
})
const friends = mongoose.model("images", friendsSchema)
export default friends