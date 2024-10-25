import mongoose from "mongoose";

const keySchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true,
    },
    identityKey: {
        type: String,
        required: true,
    },
    account
});