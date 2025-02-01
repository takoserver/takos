import mongoose from "mongoose";

const joinedGroupSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
  },
  groupId: {
    type: String,
  },
});

const JoinedGroup = mongoose.model("joinedGroup", joinedGroupSchema);

export default JoinedGroup;
