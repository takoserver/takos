import mongoose from "mongoose"

const requestSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true,
    },
    sender: {
        type: String,
        required: true
    },
    receiver: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    query: {
        type: String,
        required: true
    }
})

export default mongoose.model("Request", requestSchema)