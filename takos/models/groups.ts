import mongoose from "mongoose";

const groupSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  groupName: { type: String },
  groupDescription: { type: String },
  groupIcon: { type: String },
  owner: { type: String, required: true },
  servers: {
    type: [String],
    default: [],
  },
  invites: {
    type: [String],
    default: [],
  },
  ban: {
    type: [String],
    default: [],
  },
  to: {
    type: [String],
    default: [],
  },
  requests: {
    type: [String],
    default: [],
  },
  type: {
    type: String,
    required: true,
    enum: ["public", "private"],
  },
  allowJoin: { type: Boolean },
  beforeEventId: { type: String },
  //自分のサーバーのgroupか
  isOwner: { type: Boolean, required: true },
});

const memberSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  userId: { type: String, required: true },
  role: { type: [String], required: true },
});

const channelSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  name: { type: String, required: true },
  id: { type: String, required: true },
  category: { type: String },
});

const channelPermissionSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  channelId: { type: String, required: true },
  roleId: { type: String, required: true },
  inheritCategoryPermissions: { type: Boolean, required: true },
  permissions: {
    type: [String],
    default: [],
  },
});

const categoryPermissionSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  categoryId: { type: String, required: true },
  roleId: { type: String, required: true },
  permissions: {
    type: [String],
    default: [],
  },
});

const categorySchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  name: { type: String, required: true },
  id: { type: String, required: true },
  permissions: {
    type: [String],
    default: [],
  },
});

const roleSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  name: { type: String, required: true },
  id: { type: String, required: true },
  color: { type: String, required: true },
  permissions: {
    type: [String],
    default: [],
  },
});

const Roles = mongoose.model("roles", roleSchema);
const Category = mongoose.model("categories", categorySchema);
const Channels = mongoose.model("channels", channelSchema);
const Group = mongoose.model("group", groupSchema);
const ChannelPermissions = mongoose.model(
  "channelPermissions",
  channelPermissionSchema,
);
const CategoryPermissions = mongoose.model(
  "categoryPermissions",
  categoryPermissionSchema,
);
const Member = mongoose.model("member", memberSchema);
export {
  Category,
  CategoryPermissions,
  ChannelPermissions,
  Channels,
  Group,
  Member,
  Roles,
};
