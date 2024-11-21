import mongoose, { Schema, Document } from "mongoose";

interface IMessage extends Document {
  type: "friend" | "group";
  roomid?: string;
  friend?: string[];
  message?: string;
  sign?: string;
  timestamp?: Date;
  messageid: string;
  isLocal: boolean;
}

const messageSchema: Schema = new Schema({
  type: {
    type: String,
    required: true,
    enum: ["friend", "group"],
  },
  roomid: {
    type: String,
  },
  friend: {
    type: [String],
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
  messageid: {
    type: String,
    required: true,
  },
  isLocal: {
    type: Boolean,
    required: true,
  },
});

export default mongoose.model<IMessage>("Message", messageSchema);
