import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  groupId: {
    type: String,
    required: true,
  },
  members: {
    type: Array,
    required: true,
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
});

const Group = mongoose.model("group", groupSchema);

export default Group;
