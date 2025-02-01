import mongoose from "mongoose";

const serverListSchema = new mongoose.Schema({
  serverDomain: {
    type: String,
    required: true,
  },
});

export default mongoose.model("serverList", serverListSchema);
