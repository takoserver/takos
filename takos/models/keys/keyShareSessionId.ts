import mongoose from "mongoose";

const keyShareSessionIdSchema = new mongoose.Schema({
  keyShareSessionId: {
    type: String,
    required: true,
  },
  migrateKeyPublic: {
    type: Object,
    required: true,
  },
  migrateDataSignKeyPublic: {
    type: Object,
  },
  sign: {
    type: String,
  },
  data: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 1,
  },
});

export default mongoose.model("KeyShareSessionId", keyShareSessionIdSchema);
