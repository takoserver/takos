import ObjectStore from "../models/takos/object_store.ts";
import Note from "../models/takos/note.ts";
import Video from "../models/takos/video.ts";
import Message from "../models/takos/message.ts";
import FollowEdge from "../models/takos/follow_edge.ts";
import RelayEdge from "../models/takos/relay_edge.ts";
import { createObjectId } from "./utils/activitypub.ts";
import {
  addFollower as addFollowerAccount,
  addFollowing as addFollowingAccount,
  createAccount as createAccountRepo,
  deleteAccountById as deleteAccountByIdRepo,
  findAccountById as findAccountByIdRepo,
  findAccountByUserName as findAccountByUserNameRepo,
  listAccounts as listAccountsRepo,
  removeFollower as removeFollowerAccount,
  removeFollowing as removeFollowingAccount,
  updateAccountById as updateAccountByIdRepo,
} from "./repositories/account.ts";
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
    return await listAccountsRepo(this.env);
  }

  async createAccount(data: Record<string, unknown>) {
    return await createAccountRepo(this.env, data as never);
  }

  async findAccountById(id: string) {
    return await findAccountByIdRepo(this.env, id);
  }

  async findAccountByUserName(username: string) {
    return await findAccountByUserNameRepo(this.env, username);
  }

  async updateAccountById(id: string, update: Record<string, unknown>) {
    return await updateAccountByIdRepo(this.env, id, update);
  }

  async deleteAccountById(id: string) {
    return await deleteAccountByIdRepo(this.env, id);
  }

  async addFollower(id: string, follower: string) {
    return await addFollowerAccount(this.env, id, follower);
  }

  async removeFollower(id: string, follower: string) {
    return await removeFollowerAccount(this.env, id, follower);
  }

  async addFollowing(id: string, target: string) {
    return await addFollowingAccount(this.env, id, target);
  }

  async removeFollowing(id: string, target: string) {
    return await removeFollowingAccount(this.env, id, target);
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
    return await listAccountsRepo(this.env);
  }

  async createAccount(data: Record<string, unknown>) {
    return await createAccountRepo(this.env, data as never);
  }

  async findAccountById(id: string) {
    return await findAccountByIdRepo(this.env, id);
  }

  async findAccountByUserName(username: string) {
    return await findAccountByUserNameRepo(this.env, username);
  }

  async updateAccountById(id: string, update: Record<string, unknown>) {
    return await updateAccountByIdRepo(this.env, id, update);
  }

  async deleteAccountById(id: string) {
    return await deleteAccountByIdRepo(this.env, id);
  }

  async addFollower(id: string, follower: string) {
    return await addFollowerAccount(this.env, id, follower);
  }

  async removeFollower(id: string, follower: string) {
    return await removeFollowerAccount(this.env, id, follower);
  }

  async addFollowing(id: string, target: string) {
    return await addFollowingAccount(this.env, id, target);
  }

  async removeFollowing(id: string, target: string) {
    return await removeFollowingAccount(this.env, id, target);
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
