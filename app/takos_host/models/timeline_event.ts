import mongoose from "mongoose";

const timelineEventSchema = new mongoose.Schema({
  tenant_id: { type: String, required: true },
  object_id: { type: String, required: true },
  inserted_at: { type: Date, default: Date.now },
});

timelineEventSchema.index({ tenant_id: 1, inserted_at: -1 });

const TimelineEvent = mongoose.model("TimelineEvent", timelineEventSchema);

export default TimelineEvent;
export { timelineEventSchema };
