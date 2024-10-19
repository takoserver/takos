import mongoose from "mongoose";

const requestShema = new mongoose.Schema({
  requesterName: {
    type: String,
    required: true,
  },
  targetId: {
    type: String,
    required: true,
  },
  request: {
    type: Object,
    required: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["friend", "group"],
  },
  uuid: {
    type: String,
    required: true,
  },
});

export default mongoose.model("sendRequest", requestShema);
