import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => new mongoose.Types.ObjectId().toString(),
  },
  attributedTo: { type: String, required: true },
  actor_id: { type: String, required: true, index: true },
  content: { type: String, default: "" },
  extra: { type: mongoose.Schema.Types.Mixed, default: {} },
  // ActivityPub type 配列 ["Image"|"Video", "x:Story"]
  type: { type: [String], default: [] },
  endTime: { type: Date },
  "x:story": { type: Boolean, default: true },
  "x:overlays": { type: [mongoose.Schema.Types.Mixed], default: [] },
  "x:rev": { type: Number, default: 0 },
  published: { type: Date, default: Date.now },
  tenant_id: { type: String, index: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  deleted_at: { type: Date },
  aud: {
    to: { type: [String], default: [] },
    cc: { type: [String], default: [] },
  },
});

const HostStory = mongoose.models.HostStory ??
  mongoose.model("HostStory", storySchema);

export default HostStory;
export { storySchema };
