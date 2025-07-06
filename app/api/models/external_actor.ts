import mongoose from "mongoose";

const externalActorSchema = new mongoose.Schema({
  actorUrl: { type: String, required: true, unique: true },
  name: { type: String, default: "" },
  preferredUsername: { type: String, default: "" },
  icon: { type: mongoose.Schema.Types.Mixed, default: null },
  summary: { type: String, default: "" },
  cachedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

const ExternalActor = mongoose.model("ExternalActor", externalActorSchema);

export default ExternalActor;
export { externalActorSchema };
