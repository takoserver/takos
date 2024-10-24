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
    idenSing: {
        type: String,
        required: true,
    },
    accountKey: {
        type: String,
        required: true,
    },
    hashhex: {
        type: String,
        required: true,
    },
});