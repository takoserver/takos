import mongoose from "mongoose"

export const activitySchama = new mongoose.Schema({
  userid: {
    type: String,
  },
  activity: {
    type: String,
    required: true,
    enum: ["login", "logout", "register", "delete", "update", "accept", "group", "block", "create", "delete", "flag", "ignore", "invite", "join", "read", "req", "talk", "update"],
  },
  activityObject: {
    type: Object,
    required: true,
  },
  timestamp: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
})
const activity = mongoose.model("activity", activitySchama)
export default activity
