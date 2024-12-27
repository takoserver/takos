import mongoose from "mongoose";

const eventIdSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    expires: 0,
  },
});

const EventId = mongoose.model("eventId", eventIdSchema);

export default EventId;
