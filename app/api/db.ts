import ObjectStore from "../models/takos/object_store.ts";
import Note from "../models/takos/note.ts";
import Video from "../models/takos/video.ts";
import Message from "../models/takos/message.ts";
import FollowEdge from "../models/takos/follow_edge.ts";
import RelayEdge from "../models/takos/relay_edge.ts";
import { createObjectId } from "./utils/activitypub.ts";
import Account from "../models/takos/account.ts";
import EncryptedKeyPair from "../models/takos/encrypted_keypair.ts";
import EncryptedMessage from "../models/takos/encrypted_message.ts";
import KeyPackage from "../models/takos/key_package.ts";
import Notification from "../models/takos/notification.ts";
import PublicMessage from "../models/takos/public_message.ts";
import Relay from "../models/takos/relay.ts";
import RemoteActor from "../models/takos/remote_actor.ts";
import Session from "../models/takos/session.ts";
import mongoose from "mongoose";
import type { DB, ListOpts } from "../shared/db.ts";
import type { SortOrder } from "mongoose";
import type { Db } from "mongodb";
import { connectDatabase } from "../shared/db.ts";
import HostObjectStore from "../models/takos_host/object_store.ts";
import HostFollowEdge from "../models/takos_host/follow_edge.ts";
import HostRelayEdge from "../models/takos_host/relay_edge.ts";

/** takos 用 MongoDB 実装 */
export class MongoDBLocal implements DB {
  constructor(private env: Record<string, string>) {}

  async getObject(id: string) {
    let doc = await Note.findOne({ _id: id }).lean();
    if (doc) return doc;
    doc = await Video.findOne({ _id: id }).lean();
    if (doc) return doc;
    doc = await Message.findOne({ _id: id }).lean();
    if (doc) return doc;
    return await ObjectStore.findOne({ _id: id }).lean();
  }

  async saveObject(obj: Record<string, unknown>) {
    const data = { ...obj };
    if (!data._id && this.env["ACTIVITYPUB_DOMAIN"]) {
      data._id = createObjectId(this.env["ACTIVITYPUB_DOMAIN"]);
    }
    const doc = new ObjectStore(data);
    (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals =
      { env: this.env };
    await doc.save();
    return doc.toObject();
  }

  async listTimeline(actor: string, opts: ListOpts) {
    const docs = await FollowEdge.aggregate([
      {
        $lookup: {
          from: "notes",
          localField: "actor_id",
          foreignField: "actor_id",
          as: "objs",
        },
      },
      { $unwind: "$objs" },
      { $match: { "objs.actor_id": actor } },
      { $sort: { "objs.created_at": -1 } },
      { $limit: opts.limit ?? 40 },
    ]).exec();
    return docs.map((d) => d.objs);
  }

  async follow(_: string, target: string) {
    await FollowEdge.updateOne(
      { actor_id: target },
      { $setOnInsert: { since: new Date() } },
      { upsert: true },
    );
  }

  async unfollow(_: string, target: string) {
    await FollowEdge.deleteOne({ actor_id: target });
  }

  async listAccounts() {
    return await Account.find({}).lean();
  }

  async createAccount(data: Record<string, unknown>) {
    const doc = new Account({
      ...data,
      tenant_id: this.env["ACTIVITYPUB_DOMAIN"] ?? "",
    });
    (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals =
      {
        env: this.env,
      };
    await doc.save();
    return doc.toObject();
  }

  async findAccountById(id: string) {
    return await Account.findOne({ _id: id }).lean();
  }

  async findAccountByUserName(username: string) {
    return await Account.findOne({ userName: username }).lean();
  }

  async updateAccountById(id: string, update: Record<string, unknown>) {
    return await Account.findOneAndUpdate({ _id: id }, update, { new: true })
      .lean();
  }

  async deleteAccountById(id: string) {
    const res = await Account.findOneAndDelete({ _id: id });
    return !!res;
  }

  async addFollower(id: string, follower: string) {
    const acc = await Account.findOneAndUpdate({ _id: id }, {
      $addToSet: { followers: follower },
    }, { new: true });
    return acc?.followers ?? [];
  }

  async removeFollower(id: string, follower: string) {
    const acc = await Account.findOneAndUpdate({ _id: id }, {
      $pull: { followers: follower },
    }, { new: true });
    return acc?.followers ?? [];
  }

  async addFollowing(id: string, target: string) {
    const acc = await Account.findOneAndUpdate({ _id: id }, {
      $addToSet: { following: target },
    }, { new: true });
    return acc?.following ?? [];
  }

  async removeFollowing(id: string, target: string) {
    const acc = await Account.findOneAndUpdate({ _id: id }, {
      $pull: { following: target },
    }, { new: true });
    return acc?.following ?? [];
  }

  async saveNote(
    domain: string,
    author: string,
    content: string,
    extra: Record<string, unknown>,
    aud?: { to: string[]; cc: string[] },
  ) {
    const id = createObjectId(domain);
    const actor = `https://${domain}/users/${author}`;
    const doc = new Note({
      _id: id,
      attributedTo: author,
      actor_id: actor,
      content,
      extra,
      published: new Date(),
      aud: aud ?? {
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        cc: [],
      },
    });
    (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals =
      {
        env: this.env,
      };
    await doc.save();
    return doc.toObject();
  }

  async updateNote(id: string, update: Record<string, unknown>) {
    return await Note.findOneAndUpdate({ _id: id }, update, { new: true })
      .lean();
  }

  async deleteNote(id: string) {
    const res = await Note.findOneAndDelete({ _id: id });
    return !!res;
  }

  async findNotes(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    return await Note.find({ ...filter }).sort(sort ?? {}).lean();
  }

  async getPublicNotes(limit: number, before?: Date) {
    const query = Note.find({
      "aud.to": "https://www.w3.org/ns/activitystreams#Public",
    });
    if (before) query.where("created_at").lt(before.getTime());
    return await query.sort({ created_at: -1 }).limit(limit).lean();
  }

  async saveVideo(
    domain: string,
    author: string,
    content: string,
    extra: Record<string, unknown>,
    aud?: { to: string[]; cc: string[] },
  ) {
    const id = createObjectId(domain);
    const actor = `https://${domain}/users/${author}`;
    const doc = new Video({
      _id: id,
      attributedTo: author,
      actor_id: actor,
      content,
      extra,
      published: new Date(),
      aud: aud ?? {
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        cc: [],
      },
    });
    (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals =
      {
        env: this.env,
      };
    await doc.save();
    return doc.toObject();
  }

  async updateVideo(id: string, update: Record<string, unknown>) {
    return await Video.findOneAndUpdate({ _id: id }, update, { new: true })
      .lean();
  }

  async deleteVideo(id: string) {
    const res = await Video.findOneAndDelete({ _id: id });
    return !!res;
  }

  async findVideos(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    return await Video.find({ ...filter }).sort(sort ?? {}).lean();
  }

  async saveMessage(
    domain: string,
    author: string,
    content: string,
    extra: Record<string, unknown>,
    aud: { to: string[]; cc: string[] },
  ) {
    const id = createObjectId(domain);
    const actor = `https://${domain}/users/${author}`;
    const doc = new Message({
      _id: id,
      attributedTo: author,
      actor_id: actor,
      content,
      extra,
      published: new Date(),
      aud,
    });
    (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals =
      {
        env: this.env,
      };
    await doc.save();
    return doc.toObject();
  }

  async updateMessage(id: string, update: Record<string, unknown>) {
    return await Message.findOneAndUpdate({ _id: id }, update, { new: true })
      .lean();
  }

  async deleteMessage(id: string) {
    const res = await Message.findOneAndDelete({ _id: id });
    return !!res;
  }

  async findMessages(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    return await Message.find({ ...filter }).sort(sort ?? {}).lean();
  }

  async findObjects(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    const notes = await Note.find({ ...filter }).sort(sort ?? {}).lean();
    const videos = await Video.find({ ...filter }).sort(sort ?? {}).lean();
    const messages = await Message.find({ ...filter }).sort(sort ?? {}).lean();
    return [...notes, ...videos, ...messages];
  }

  async updateObject(id: string, update: Record<string, unknown>) {
    return await ObjectStore.findOneAndUpdate({ _id: id }, update, {
      new: true,
    }).lean();
  }

  async deleteObject(id: string) {
    const res = await ObjectStore.findOneAndDelete({ _id: id });
    return !!res;
  }

  async deleteManyObjects(filter: Record<string, unknown>) {
    return await ObjectStore.deleteMany({ ...filter });
  }

  async listPushRelays() {
    const docs = await RelayEdge.find({ mode: "push" }).lean<
      { relay: string }[]
    >();
    return docs.map((d) => d.relay);
  }

  async listPullRelays() {
    const docs = await RelayEdge.find({ mode: "pull" }).lean<
      { relay: string }[]
    >();
    return docs.map((d) => d.relay);
  }

  async addRelay(relay: string, mode: "pull" | "push" = "pull") {
    await RelayEdge.updateOne(
      { relay, mode },
      { $setOnInsert: { since: new Date() } },
      { upsert: true },
    );
  }

  async removeRelay(relay: string) {
    await RelayEdge.deleteMany({ relay });
  }

  async getDatabase() {
    await connectDatabase(this.env);
    return mongoose.connection.db as Db;
  }
}

/** takos host 用 MongoDB 実装 */
export class MongoDBHost implements DB {
  constructor(private env: Record<string, string>) {}

  private get tenantId() {
    return this.env["ACTIVITYPUB_DOMAIN"] ?? "";
  }

  async getObject(id: string) {
    return await HostObjectStore.findOne({
      _id: id,
      tenant_id: this.tenantId,
    }).lean();
  }

  async saveObject(obj: Record<string, unknown>) {
    const data = { ...obj };
    if (!data._id) {
      data._id = createObjectId(this.tenantId);
    }
    const doc = new HostObjectStore({ ...data, tenant_id: this.tenantId });
    await doc.save();
    return doc.toObject();
  }

  async listTimeline(actor: string, opts: ListOpts) {
    const docs = await HostFollowEdge.aggregate([
      { $match: { tenant_id: this.tenantId } },
      {
        $lookup: {
          from: "object_store",
          localField: "actor_id",
          foreignField: "actor_id",
          as: "objs",
        },
      },
      { $unwind: "$objs" },
      { $match: { "objs.actor_id": actor } },
      { $sort: { "objs.created_at": -1 } },
      { $limit: opts.limit ?? 40 },
    ]).exec();
    return docs.map((d) => d.objs);
  }

  async follow(_: string, target: string) {
    await HostFollowEdge.updateOne(
      { tenant_id: this.tenantId, actor_id: target },
      { $setOnInsert: { since: new Date() } },
      { upsert: true },
    );
  }

  async unfollow(_: string, target: string) {
    await HostFollowEdge.deleteOne({
      tenant_id: this.tenantId,
      actor_id: target,
    });
  }

  async listAccounts() {
    return await Account.find({}).lean();
  }

  async createAccount(data: Record<string, unknown>) {
    const doc = new Account({
      ...data,
      tenant_id: this.tenantId,
    });
    await doc.save();
    return doc.toObject();
  }

  async findAccountById(id: string) {
    return await Account.findOne({ _id: id }).lean();
  }

  async findAccountByUserName(username: string) {
    return await Account.findOne({ userName: username }).lean();
  }

  async updateAccountById(id: string, update: Record<string, unknown>) {
    return await Account.findOneAndUpdate({ _id: id }, update, { new: true })
      .lean();
  }

  async deleteAccountById(id: string) {
    const res = await Account.findOneAndDelete({ _id: id });
    return !!res;
  }

  async addFollower(id: string, follower: string) {
    const acc = await Account.findOneAndUpdate({ _id: id }, {
      $addToSet: { followers: follower },
    }, { new: true });
    return acc?.followers ?? [];
  }

  async removeFollower(id: string, follower: string) {
    const acc = await Account.findOneAndUpdate({ _id: id }, {
      $pull: { followers: follower },
    }, { new: true });
    return acc?.followers ?? [];
  }

  async addFollowing(id: string, target: string) {
    const acc = await Account.findOneAndUpdate({ _id: id }, {
      $addToSet: { following: target },
    }, { new: true });
    return acc?.following ?? [];
  }

  async removeFollowing(id: string, target: string) {
    const acc = await Account.findOneAndUpdate({ _id: id }, {
      $pull: { following: target },
    }, { new: true });
    return acc?.following ?? [];
  }

  async saveNote(
    domain: string,
    author: string,
    content: string,
    extra: Record<string, unknown>,
    aud?: { to: string[]; cc: string[] },
  ) {
    const id = createObjectId(domain);
    const actor = `https://${domain}/users/${author}`;
    const doc = new HostObjectStore({
      _id: id,
      type: "Note",
      attributedTo: author,
      actor_id: actor,
      content,
      extra,
      tenant_id: this.tenantId,
      published: new Date(),
      aud: aud ?? {
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        cc: [],
      },
    });
    await doc.save();
    return doc.toObject();
  }

  async updateNote(id: string, update: Record<string, unknown>) {
    return await HostObjectStore.findOneAndUpdate(
      { _id: id, tenant_id: this.tenantId, type: "Note" },
      update,
      { new: true },
    ).lean();
  }

  async deleteNote(id: string) {
    const res = await HostObjectStore.findOneAndDelete({
      _id: id,
      tenant_id: this.tenantId,
      type: "Note",
    });
    return !!res;
  }

  async findNotes(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    return await HostObjectStore.find({
      ...filter,
      tenant_id: this.tenantId,
      type: "Note",
    }).sort(sort ?? {}).lean();
  }

  async getPublicNotes(limit: number, before?: Date) {
    const query = HostObjectStore.find({
      tenant_id: this.tenantId,
      type: "Note",
      "aud.to": "https://www.w3.org/ns/activitystreams#Public",
    });
    if (before) query.where("created_at").lt(before.getTime());
    return await query.sort({ created_at: -1 }).limit(limit).lean();
  }

  async saveVideo(
    domain: string,
    author: string,
    content: string,
    extra: Record<string, unknown>,
    aud?: { to: string[]; cc: string[] },
  ) {
    const id = createObjectId(domain);
    const actor = `https://${domain}/users/${author}`;
    const doc = new HostObjectStore({
      _id: id,
      type: "Video",
      attributedTo: author,
      actor_id: actor,
      content,
      extra,
      tenant_id: this.tenantId,
      published: new Date(),
      aud: aud ?? {
        to: ["https://www.w3.org/ns/activitystreams#Public"],
        cc: [],
      },
    });
    await doc.save();
    return doc.toObject();
  }

  async updateVideo(id: string, update: Record<string, unknown>) {
    return await HostObjectStore.findOneAndUpdate(
      { _id: id, tenant_id: this.tenantId, type: "Video" },
      update,
      { new: true },
    ).lean();
  }

  async deleteVideo(id: string) {
    const res = await HostObjectStore.findOneAndDelete({
      _id: id,
      tenant_id: this.tenantId,
      type: "Video",
    });
    return !!res;
  }

  async findVideos(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    return await HostObjectStore.find({
      ...filter,
      tenant_id: this.tenantId,
      type: "Video",
    }).sort(sort ?? {}).lean();
  }

  async saveMessage(
    domain: string,
    author: string,
    content: string,
    extra: Record<string, unknown>,
    aud: { to: string[]; cc: string[] },
  ) {
    const id = createObjectId(domain);
    const actor = `https://${domain}/users/${author}`;
    const doc = new HostObjectStore({
      _id: id,
      type: "Message",
      attributedTo: author,
      actor_id: actor,
      content,
      extra,
      tenant_id: this.tenantId,
      published: new Date(),
      aud,
    });
    await doc.save();
    return doc.toObject();
  }

  async updateMessage(id: string, update: Record<string, unknown>) {
    return await HostObjectStore.findOneAndUpdate(
      { _id: id, tenant_id: this.tenantId, type: "Message" },
      update,
      { new: true },
    ).lean();
  }

  async deleteMessage(id: string) {
    const res = await HostObjectStore.findOneAndDelete({
      _id: id,
      tenant_id: this.tenantId,
      type: "Message",
    });
    return !!res;
  }

  async findMessages(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    return await HostObjectStore.find({
      ...filter,
      tenant_id: this.tenantId,
      type: "Message",
    }).sort(sort ?? {}).lean();
  }

  async findObjects(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    return await HostObjectStore.find({
      ...filter,
      tenant_id: this.tenantId,
    }).sort(sort ?? {}).lean();
  }

  async updateObject(id: string, update: Record<string, unknown>) {
    return await HostObjectStore.findOneAndUpdate(
      { _id: id, tenant_id: this.tenantId },
      update,
      { new: true },
    ).lean();
  }

  async deleteObject(id: string) {
    const res = await HostObjectStore.findOneAndDelete({
      _id: id,
      tenant_id: this.tenantId,
    });
    return !!res;
  }

  async deleteManyObjects(filter: Record<string, unknown>) {
    return await HostObjectStore.deleteMany({
      ...filter,
      tenant_id: this.tenantId,
    });
  }

  async listPushRelays() {
    const docs = await HostRelayEdge.find({
      tenant_id: this.tenantId,
      mode: "push",
    }).lean<{ relay: string }[]>();
    return docs.map((d) => d.relay);
  }

  async listPullRelays() {
    const docs = await HostRelayEdge.find({
      tenant_id: this.tenantId,
      mode: "pull",
    }).lean<{ relay: string }[]>();
    return docs.map((d) => d.relay);
  }

  async addRelay(relay: string, mode: "pull" | "push" = "pull") {
    await HostRelayEdge.updateOne(
      { tenant_id: this.tenantId, relay, mode },
      { $setOnInsert: { since: new Date() } },
      { upsert: true },
    );
  }

  async removeRelay(relay: string) {
    await HostRelayEdge.deleteMany({ tenant_id: this.tenantId, relay });
  }

  async getDatabase() {
    await connectDatabase(this.env);
    return mongoose.connection.db as Db;
  }
}

export function createDB(env: Record<string, string>): DB {
  if (env["DB_MODE"] === "host") {
    return new MongoDBHost(env);
  }
  return new MongoDBLocal(env);
}

// ------------------------------
// 既存リポジトリのラッパー関数群
// ------------------------------

export async function listAccounts(env: Record<string, string>) {
  const db = createDB(env);
  return await db.listAccounts();
}

export async function createAccount(
  env: Record<string, string>,
  data: Record<string, unknown>,
) {
  const db = createDB(env);
  return await db.createAccount(data);
}

export async function findAccountById(env: Record<string, string>, id: string) {
  const db = createDB(env);
  return await db.findAccountById(id);
}

export async function findAccountByUserName(
  env: Record<string, string>,
  username: string,
) {
  const db = createDB(env);
  return await db.findAccountByUserName(username);
}

export async function updateAccountById(
  env: Record<string, string>,
  id: string,
  update: Record<string, unknown>,
) {
  const db = createDB(env);
  return await db.updateAccountById(id, update);
}

export async function deleteAccountById(
  env: Record<string, string>,
  id: string,
) {
  const db = createDB(env);
  return await db.deleteAccountById(id);
}

export async function addFollower(
  env: Record<string, string>,
  id: string,
  follower: string,
) {
  const db = createDB(env);
  return await db.addFollower(id, follower);
}

export async function removeFollower(
  env: Record<string, string>,
  id: string,
  follower: string,
) {
  const db = createDB(env);
  return await db.removeFollower(id, follower);
}

export async function addFollowing(
  env: Record<string, string>,
  id: string,
  target: string,
) {
  const db = createDB(env);
  return await db.addFollowing(id, target);
}

export async function removeFollowing(
  env: Record<string, string>,
  id: string,
  target: string,
) {
  const db = createDB(env);
  return await db.removeFollowing(id, target);
}

export async function addFollowerByName(
  _env: Record<string, string>,
  username: string,
  follower: string,
) {
  await Account.updateOne({ userName: username }, {
    $addToSet: { followers: follower },
  });
}

export async function removeFollowerByName(
  _env: Record<string, string>,
  username: string,
  follower: string,
) {
  await Account.updateOne({ userName: username }, {
    $pull: { followers: follower },
  });
}

export async function searchAccounts(
  _env: Record<string, string>,
  query: RegExp,
  limit = 20,
) {
  return await Account.find({
    $or: [{ userName: query }, { displayName: query }],
  })
    .limit(limit)
    .lean();
}

export async function updateAccountByUserName(
  _env: Record<string, string>,
  username: string,
  update: Record<string, unknown>,
) {
  await Account.updateOne({ userName: username }, update);
}

export async function findAccountsByUserNames(
  _env: Record<string, string>,
  usernames: string[],
) {
  return await Account.find({ userName: { $in: usernames } }).lean();
}

export async function countAccounts(_env: Record<string, string>) {
  return await Account.countDocuments({});
}

export async function createEncryptedMessage(data: {
  from: string;
  to: string[];
  content: string;
  mediaType?: string;
  encoding?: string;
}) {
  const doc = await EncryptedMessage.create({
    from: data.from,
    to: data.to,
    content: data.content,
    mediaType: data.mediaType ?? "message/mls",
    encoding: data.encoding ?? "base64",
  });
  return doc.toObject();
}

export async function findEncryptedMessages(
  condition: Record<string, unknown>,
  opts: { before?: string; after?: string; limit?: number } = {},
) {
  const query = EncryptedMessage.find(condition);
  if (opts.before) {
    query.where("createdAt").lt(new Date(opts.before) as unknown as number);
  }
  if (opts.after) {
    query.where("createdAt").gt(new Date(opts.after) as unknown as number);
  }
  const list = await query
    .sort({ createdAt: -1 })
    .limit(opts.limit ?? 50)
    .lean();
  return list;
}

export async function findEncryptedKeyPair(
  userName: string,
) {
  return await EncryptedKeyPair.findOne({ userName }).lean();
}

export async function upsertEncryptedKeyPair(
  userName: string,
  content: string,
) {
  await EncryptedKeyPair.findOneAndUpdate({ userName }, { content }, {
    upsert: true,
  });
}

export async function deleteEncryptedKeyPair(userName: string) {
  await EncryptedKeyPair.deleteOne({ userName });
}

export async function listKeyPackages(
  env: Record<string, string>,
  userName: string,
) {
  const tenantId = env["ACTIVITYPUB_DOMAIN"] ?? "";
  return await KeyPackage.find({ userName, tenant_id: tenantId }).lean();
}

export async function findKeyPackage(
  env: Record<string, string>,
  userName: string,
  id: string,
) {
  const tenantId = env["ACTIVITYPUB_DOMAIN"] ?? "";
  return await KeyPackage.findOne({ _id: id, userName, tenant_id: tenantId })
    .lean();
}

export async function createKeyPackage(
  env: Record<string, string>,
  userName: string,
  content: string,
  mediaType = "message/mls",
  encoding = "base64",
) {
  const doc = new KeyPackage({
    userName,
    content,
    mediaType,
    encoding,
    tenant_id: env["ACTIVITYPUB_DOMAIN"] ?? "",
  });
  (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals = {
    env,
  };
  await doc.save();
  return doc.toObject();
}

export async function deleteKeyPackage(
  env: Record<string, string>,
  userName: string,
  id: string,
) {
  const tenantId = env["ACTIVITYPUB_DOMAIN"] ?? "";
  await KeyPackage.deleteOne({ _id: id, userName, tenant_id: tenantId });
}

export async function deleteKeyPackagesByUser(
  env: Record<string, string>,
  userName: string,
) {
  const tenantId = env["ACTIVITYPUB_DOMAIN"] ?? "";
  await KeyPackage.deleteMany({ userName, tenant_id: tenantId });
}

export async function createPublicMessage(
  env: Record<string, string>,
  data: {
    from: string;
    to: string[];
    content: string;
    mediaType?: string;
    encoding?: string;
  },
) {
  const doc = new PublicMessage({
    from: data.from,
    to: data.to,
    content: data.content,
    mediaType: data.mediaType ?? "message/mls",
    encoding: data.encoding ?? "base64",
    tenant_id: env["ACTIVITYPUB_DOMAIN"] ?? "",
  });
  (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals = {
    env,
  };
  await doc.save();
  return doc.toObject();
}

export async function findPublicMessages(
  env: Record<string, string>,
  condition: Record<string, unknown>,
  opts: { before?: string; after?: string; limit?: number } = {},
) {
  const tenantId = env["ACTIVITYPUB_DOMAIN"] ?? "";
  const query = PublicMessage.find({ ...condition, tenant_id: tenantId });
  if (opts.before) {
    query.where("createdAt").lt(new Date(opts.before) as unknown as number);
  }
  if (opts.after) {
    query.where("createdAt").gt(new Date(opts.after) as unknown as number);
  }
  const list = await query
    .sort({ createdAt: -1 })
    .limit(opts.limit ?? 50)
    .lean();
  return list;
}

export async function listNotifications(env: Record<string, string>) {
  const tenantId = env["ACTIVITYPUB_DOMAIN"] ?? "";
  return await Notification.find({ tenant_id: tenantId })
    .sort({ createdAt: -1 })
    .lean();
}

export async function createNotification(
  env: Record<string, string>,
  title: string,
  message: string,
  type: string,
) {
  const doc = new Notification({ title, message, type });
  (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals = {
    env,
  };
  await doc.save();
  return doc.toObject();
}

export async function markNotificationRead(
  env: Record<string, string>,
  id: string,
) {
  const tenantId = env["ACTIVITYPUB_DOMAIN"] ?? "";
  const res = await Notification.findOneAndUpdate(
    { _id: id, tenant_id: tenantId },
    { read: true },
  );
  return !!res;
}

export async function deleteNotification(
  env: Record<string, string>,
  id: string,
) {
  const tenantId = env["ACTIVITYPUB_DOMAIN"] ?? "";
  const res = await Notification.findOneAndDelete({
    _id: id,
    tenant_id: tenantId,
  });
  return !!res;
}

export async function findRelaysByHosts(hosts: string[]) {
  const docs = await Relay.find({ host: { $in: hosts } }).lean();
  return docs.map((d) => ({
    _id: String(d._id),
    host: d.host,
    inboxUrl: d.inboxUrl,
  }));
}

export async function findRelayByHost(host: string) {
  const doc = await Relay.findOne({ host }).lean();
  return doc
    ? { _id: String(doc._id), host: doc.host, inboxUrl: doc.inboxUrl }
    : null;
}

export async function createRelay(data: { host: string; inboxUrl: string }) {
  const doc = new Relay({ host: data.host, inboxUrl: data.inboxUrl });
  await doc.save();
  return { _id: String(doc._id), host: doc.host, inboxUrl: doc.inboxUrl };
}

export async function deleteRelayById(id: string) {
  const doc = await Relay.findByIdAndDelete(id).lean();
  return doc
    ? { _id: String(doc._id), host: doc.host, inboxUrl: doc.inboxUrl }
    : null;
}

export async function findRemoteActorByUrl(url: string) {
  return await RemoteActor.findOne({ actorUrl: url }).lean();
}

export async function findRemoteActorsByUrls(urls: string[]) {
  return await RemoteActor.find({ actorUrl: { $in: urls } }).lean();
}

export async function upsertRemoteActor(data: {
  actorUrl: string;
  name: string;
  preferredUsername: string;
  icon: unknown;
  summary: string;
}) {
  await RemoteActor.findOneAndUpdate(
    { actorUrl: data.actorUrl },
    {
      name: data.name,
      preferredUsername: data.preferredUsername,
      icon: data.icon,
      summary: data.summary,
      cachedAt: new Date(),
    },
    { upsert: true },
  );
}

export async function createSession(
  _env: Record<string, string>,
  sessionId: string,
  expiresAt: Date,
  tenantId: string,
) {
  const doc = new Session({
    sessionId,
    expiresAt,
    tenant_id: tenantId,
  });
  (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals = {
    env: _env,
  };
  await doc.save();
  return doc.toObject();
}

export async function findSessionById(
  _env: Record<string, string>,
  sessionId: string,
) {
  return await Session.findOne({ sessionId }).lean();
}

export async function deleteSessionById(
  _env: Record<string, string>,
  sessionId: string,
) {
  await Session.deleteOne({ sessionId });
}

export async function updateSessionExpires(
  _env: Record<string, string>,
  sessionId: string,
  expires: Date,
) {
  await Session.updateOne({ sessionId }, { expiresAt: expires });
}
