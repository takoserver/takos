import mongoose from "mongoose";

interface IPluginActor {
  identifier: string;
  localName: string;
  iri: string;
  actor: Record<string, unknown>;
  privateKeyPem: string;
  createdAt?: Date;
}

const pluginActorSchema = new mongoose.Schema<IPluginActor>({
  identifier: { type: String, required: true, index: true },
  localName: { type: String, required: true },
  iri: { type: String, required: true, unique: true },
  actor: { type: Object, required: true },
  privateKeyPem: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
pluginActorSchema.index({ identifier: 1, localName: 1 }, { unique: true });

export const PluginActor = mongoose.model<IPluginActor>(
  "PluginActor",
  pluginActorSchema,
);
