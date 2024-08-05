import mongoose from "mongoose";
const sessionidSchema = new mongoose.Schema({
  sessionid: {
    type: String,
    required: true,
    unique: true,
  },
  uuid: {
    type: String,
    required: true,
  },
  timestamp: { type: Date, default: Date.now },
  limit: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 },
});
const Sessionid = mongoose.model("sessionid", sessionidSchema);
export default Sessionid;
