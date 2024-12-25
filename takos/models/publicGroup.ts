import mongoose from "mongoose";

const publicGroupSchema = new mongoose.Schema({
  groupId: {
    type: String,
    required: true,
  },
  members: {
    type: Array,
  },
  isMyServer: {
    type: Boolean,
    required: true,
  },
  groupName: {
    type: String,
  },
  groupDescription: {
    type: String,
  },
  groupIcon: {
    type: String,
  },
  allowServers: {
    type: Array,
  },
});

const PublicGroup = mongoose.model("publicGroup", publicGroupSchema);

export default PublicGroup;