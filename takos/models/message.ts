import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  messageid: string;
  isLocal: boolean;
  type: string;
  roomid: string;
  message: string;
  sign: string;
  timestamp: Date;
  read: string[];
}

const messageSchema: Schema = new Schema({
  messageid: {
    type: String,
    required: true,
  },
  isLocal: {
    type: Boolean,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["friend", "group"],
  },
  roomid: {
    type: String,
  },
  message: {
    type: String,
  },
  sign: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Array,
  },
  roomKeyKyash: {
    type: String,
  }
});

export default mongoose.model<Document>("Message", messageSchema);
