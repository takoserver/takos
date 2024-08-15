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
  //鍵を持っているかどうか
  key: {
    type: Boolean,
    default: false,
  },
  //有効かどうか 期限が切れ場合falseにし、再びログインすることでtrueになる
  enable: {
    type: Boolean,
    default: true,
  },
  deviceKey: {
    type: String,
  },
});
const Sessionid = mongoose.model("sessionid", sessionidSchema);
export default Sessionid;
