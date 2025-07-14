import mongoose from "mongoose";

const objectStoreSchema = new mongoose.Schema({
  _id: { type: String },
  raw: { type: mongoose.Schema.Types.Mixed, required: true },
  type: { type: String, required: true },
  actor_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date, default: null },
  aud: {
    to: { type: [String], default: [] },
    cc: { type: [String], default: [] },
  },
});

objectStoreSchema.index({ deleted_at: 1 }, { expireAfterSeconds: 0 });
objectStoreSchema.index({ actor_id: "hashed" });

const ObjectStore = mongoose.model("ObjectStore", objectStoreSchema);

export default ObjectStore;
export { objectStoreSchema };
