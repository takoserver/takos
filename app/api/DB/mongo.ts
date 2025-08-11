import Note from "../models/takos/note.ts";
import Video from "../models/takos/video.ts";
import Message from "../models/takos/message.ts";
import Attachment from "../models/takos/attachment.ts";
import FollowEdge from "../models/takos/follow_edge.ts";
import { createObjectId } from "../utils/activitypub.ts";
import Account from "../models/takos/account.ts";
import EncryptedKeyPair from "../models/takos/encrypted_keypair.ts";
import EncryptedMessage from "../models/takos/encrypted_message.ts";
import KeyPackage from "../models/takos/key_package.ts";
import Notification from "../models/takos/notification.ts";
import HandshakeMessage from "../models/takos/handshake_message.ts";
import SystemKey from "../models/takos/system_key.ts";
import RemoteActor from "../models/takos/remote_actor.ts";
import Session from "../models/takos/session.ts";
import FcmToken from "../models/takos/fcm_token.ts";
import Instance from "../../takos_host/models/instance.ts";
import OAuthClient from "../../takos_host/models/oauth_client.ts";
import HostDomain from "../../takos_host/models/domain.ts";
import Tenant from "../models/takos/tenant.ts";
import mongoose from "mongoose";
import type { DB, GroupInfo, ListOpts } from "../../shared/db.ts";
import type { AccountDoc, SessionDoc } from "../../shared/types.ts";
import type { SortOrder } from "mongoose";
import type { Db } from "mongodb";
import { connectDatabase } from "../../shared/db.ts";

/** 共通 MongoDB 実装 */
export class MongoDB implements DB {
  constructor(
    private env: Record<string, string>,
    private tenantId?: string,
  ) {
    if (tenantId) Deno.env.set("ACTIVITYPUB_DOMAIN", tenantId);
  }

  private withTenant(filter: Record<string, unknown>) {
    return this.tenantId ? { ...filter, tenant_id: this.tenantId } : filter;
  }

  async getObject(id: string) {
    let doc = await Note.findOne(this.withTenant({ _id: id })).lean();
    if (doc) return doc;
    doc = await Video.findOne(this.withTenant({ _id: id })).lean();
    if (doc) return doc;
    doc = await Message.findOne(this.withTenant({ _id: id })).lean();
    if (doc) return doc;
    doc = await Attachment.findOne(this.withTenant({ _id: id })).lean();
    if (doc) return doc;
    return null;
  }

  async saveObject(obj: Record<string, unknown>) {
    const data = { ...obj };
    if (!data.actor_id && typeof data.attributedTo === "string") {
      try {
        data.actor_id = new URL(data.attributedTo).href;
      } catch {
        if (this.env["ACTIVITYPUB_DOMAIN"]) {
          data.actor_id = `https://${
            this.env["ACTIVITYPUB_DOMAIN"]
          }/users/${data.attributedTo}`;
        }
      }
    }
    if (!data._id && this.env["ACTIVITYPUB_DOMAIN"]) {
      data._id = createObjectId(this.env["ACTIVITYPUB_DOMAIN"]);
    }
    if (data.type === "Note") {
      const doc = new Note(
        this.withTenant({
          _id: data._id,
          attributedTo: String(data.attributedTo),
          actor_id: String(data.actor_id),
          content: String(data.content ?? ""),
          extra: data.extra ?? {},
          published: data.published ?? new Date(),
          aud: data.aud ?? { to: [], cc: [] },
        }),
      );
      (doc as unknown as { $locals?: { env?: Record<string, string> } })
        .$locals = { env: this.env };
      await doc.save();
      return doc.toObject();
    }
    if (data.type === "Video") {
      const doc = new Video(
        this.withTenant({
          _id: data._id,
          attributedTo: String(data.attributedTo),
          actor_id: String(data.actor_id),
          content: String(data.content ?? ""),
          extra: data.extra ?? {},
          published: data.published ?? new Date(),
          aud: data.aud ?? { to: [], cc: [] },
        }),
      );
      (doc as unknown as { $locals?: { env?: Record<string, string> } })
        .$locals = { env: this.env };
      await doc.save();
      return doc.toObject();
    }
    if (data.type === "Message") {
      const doc = new Message(
        this.withTenant({
          _id: data._id,
          attributedTo: String(data.attributedTo),
          actor_id: String(data.actor_id),
          content: String(data.content ?? ""),
          extra: data.extra ?? {},
          published: data.published ?? new Date(),
          aud: data.aud ?? { to: [], cc: [] },
        }),
      );
      (doc as unknown as { $locals?: { env?: Record<string, string> } })
        .$locals = { env: this.env };
      await doc.save();
      return doc.toObject();
    }
    if (data.type === "Attachment") {
      const doc = new Attachment(
        this.withTenant({
          _id: data._id,
          attributedTo: String(data.attributedTo),
          actor_id: String(data.actor_id),
          extra: data.extra ?? {},
        }),
      );
      await doc.save();
      return doc.toObject();
    }
    return null;
  }

  async listTimeline(actor: string, opts: ListOpts) {
    let name = actor;
    try {
      const url = new URL(actor);
      if (
        url.hostname === this.env["ACTIVITYPUB_DOMAIN"] &&
        url.pathname.startsWith("/users/")
      ) {
        name = url.pathname.split("/")[2];
      }
    } catch {
      // actor is not URL
    }
    const account = await Account.findOne(this.withTenant({ userName: name }))
      .lean<{ following?: string[] } | null>();
    const ids = account?.following ?? [];
    if (actor) ids.push(actor);
    // タイムラインには Note のみを表示する
    const filter: Record<string, unknown> = { actor_id: { $in: ids } };
    if (opts.before) filter.created_at = { $lt: opts.before };
    return await Note.find(this.withTenant(filter))
      .sort({ created_at: -1 })
      .limit(opts.limit ?? 40)
      .lean();
  }

  async follow(_: string, target: string) {
    await FollowEdge.updateOne(
      this.withTenant({ actor_id: target }),
      { $setOnInsert: { since: new Date() } },
      { upsert: true },
    );
  }

  async unfollow(_: string, target: string) {
    await FollowEdge.deleteOne(this.withTenant({ actor_id: target }));
  }

  async listAccounts(): Promise<AccountDoc[]> {
    return await Account.find(this.withTenant({})).lean<AccountDoc[]>();
  }

  async createAccount(data: Record<string, unknown>): Promise<AccountDoc> {
    const doc = new Account(this.withTenant({ ...data }));
    (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals =
      {
        env: this.env,
      };
    await doc.save();
    return doc.toObject() as AccountDoc;
  }

  async findAccountById(id: string): Promise<AccountDoc | null> {
    return await Account.findOne(this.withTenant({ _id: id })).lean<
      AccountDoc | null
    >();
  }

  async findAccountByUserName(
    username: string,
  ): Promise<AccountDoc | null> {
    return await Account.findOne(this.withTenant({ userName: username }))
      .lean<AccountDoc | null>();
  }

  async updateAccountById(
    id: string,
    update: Record<string, unknown>,
  ): Promise<AccountDoc | null> {
    return await Account.findOneAndUpdate(
      this.withTenant({ _id: id }),
      update,
      { new: true },
    ).lean<AccountDoc | null>();
  }

  async deleteAccountById(id: string) {
    const res = await Account.findOneAndDelete(this.withTenant({ _id: id }));
    return !!res;
  }

  async addFollower(id: string, follower: string) {
    const acc = await Account.findOneAndUpdate(
      this.withTenant({ _id: id }),
      { $addToSet: { followers: follower } },
      { new: true },
    );
    return acc?.followers ?? [];
  }

  async removeFollower(id: string, follower: string) {
    const acc = await Account.findOneAndUpdate(
      this.withTenant({ _id: id }),
      { $pull: { followers: follower } },
      { new: true },
    );
    return acc?.followers ?? [];
  }

  async addFollowing(id: string, target: string) {
    const acc = await Account.findOneAndUpdate(
      this.withTenant({ _id: id }),
      { $addToSet: { following: target } },
      { new: true },
    );
    return acc?.following ?? [];
  }

  async removeFollowing(id: string, target: string) {
    const acc = await Account.findOneAndUpdate(
      this.withTenant({ _id: id }),
      { $pull: { following: target } },
      { new: true },
    );
    return acc?.following ?? [];
  }

  async listGroups(id: string) {
    const acc = await Account.findOne(this.withTenant({ _id: id })).lean<
      { groups?: GroupInfo[] } | null
    >();
    return acc?.groups ?? [];
  }

  async addGroup(
    id: string,
    group: GroupInfo,
  ) {
    const acc = await Account.findOneAndUpdate(
      this.withTenant({ _id: id }),
      { $push: { groups: group } },
      { new: true },
    );
    return acc?.groups ?? [];
  }

  async removeGroup(id: string, groupId: string) {
    const acc = await Account.findOneAndUpdate(
      this.withTenant({ _id: id }),
      { $pull: { groups: { id: groupId } } },
      { new: true },
    );
    return acc?.groups ?? [];
  }

  async findGroup(groupId: string) {
    const acc = await Account.findOne(
      this.withTenant({ "groups.id": groupId }),
    ).lean<
      | {
        _id: unknown;
        groups: GroupInfo[];
      }
      | null
    >();
    const group = acc?.groups.find((g) => g.id === groupId);
    if (!group || !acc?._id) return null;
    return { owner: String(acc._id), group };
  }

  async updateGroup(
    owner: string,
    group: GroupInfo,
  ) {
    await Account.updateOne(
      this.withTenant({ _id: owner, "groups.id": group.id }),
      { $set: { "groups.$": group } },
    );
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
    return await Note.findOneAndUpdate(
      this.withTenant({ _id: id }),
      update,
      { new: true },
    ).lean();
  }

  async deleteNote(id: string) {
    const res = await Note.findOneAndDelete(this.withTenant({ _id: id }));
    return !!res;
  }

  async findNotes(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    return await Note.find(this.withTenant({ ...filter }))
      .sort(sort ?? {})
      .lean();
  }

  async getPublicNotes(limit: number, before?: Date) {
    const query = Note.find(
      this.withTenant({
        "aud.to": "https://www.w3.org/ns/activitystreams#Public",
      }),
    );
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
      attributedTo: actor,
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
    return await Video.findOneAndUpdate(
      this.withTenant({ _id: id }),
      update,
      { new: true },
    ).lean();
  }

  async deleteVideo(id: string) {
    const res = await Video.findOneAndDelete(this.withTenant({ _id: id }));
    return !!res;
  }

  async findVideos(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    return await Video.find(this.withTenant({ ...filter }))
      .sort(sort ?? {})
      .lean();
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
    return await Message.findOneAndUpdate(
      this.withTenant({ _id: id }),
      update,
      { new: true },
    ).lean();
  }

  async deleteMessage(id: string) {
    const res = await Message.findOneAndDelete(this.withTenant({ _id: id }));
    return !!res;
  }

  async findMessages(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    return await Message.find(this.withTenant({ ...filter }))
      .sort(sort ?? {})
      .lean();
  }

  async findObjects(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ) {
    const { type, ...rest } = filter;
    const result: unknown[] = [];
    // type が指定されている場合は対象のモデルのみ検索する
    if (!type || type === "Note") {
      const notes = await Note.find(this.withTenant({ ...rest }))
        .sort(sort ?? {})
        .lean();
      result.push(...notes.map((n) => ({ ...n, type: "Note" })));
    }
    if (!type || type === "Video") {
      const videos = await Video.find(this.withTenant({ ...rest }))
        .sort(sort ?? {})
        .lean();
      result.push(...videos.map((v) => ({ ...v, type: "Video" })));
    }
    if (!type || type === "Message") {
      const messages = await Message.find(this.withTenant({ ...rest }))
        .sort(sort ?? {})
        .lean();
      result.push(...messages.map((m) => ({ ...m, type: "Message" })));
    }
    return result;
  }

  async updateObject(id: string, update: Record<string, unknown>) {
    let doc = await Note.findOneAndUpdate(
      this.withTenant({ _id: id }),
      update,
      { new: true },
    ).lean();
    if (doc) return doc;
    doc = await Video.findOneAndUpdate(
      this.withTenant({ _id: id }),
      update,
      { new: true },
    ).lean();
    if (doc) return doc;
    doc = await Message.findOneAndUpdate(
      this.withTenant({ _id: id }),
      update,
      { new: true },
    ).lean();
    if (doc) return doc;
    return null;
  }

  async deleteObject(id: string) {
    let res = await Note.findOneAndDelete(this.withTenant({ _id: id }));
    if (res) return true;
    res = await Video.findOneAndDelete(this.withTenant({ _id: id }));
    if (res) return true;
    res = await Message.findOneAndDelete(this.withTenant({ _id: id }));
    if (res) return true;
    return false;
  }

  async deleteManyObjects(filter: Record<string, unknown>) {
    if (filter.type === "Note") {
      return await Note.deleteMany(this.withTenant({ ...filter }));
    }
    if (filter.type === "Video") {
      return await Video.deleteMany(this.withTenant({ ...filter }));
    }
    if (filter.type === "Message") {
      return await Message.deleteMany(this.withTenant({ ...filter }));
    }
    return { deletedCount: 0 };
  }

  async addFollowerByName(username: string, follower: string) {
    await Account.updateOne({ userName: username }, {
      $addToSet: { followers: follower },
    });
  }

  async removeFollowerByName(username: string, follower: string) {
    await Account.updateOne({ userName: username }, {
      $pull: { followers: follower },
    });
  }

  async searchAccounts(
    query: RegExp,
    limit = 20,
  ): Promise<AccountDoc[]> {
    return await Account.find({
      $or: [{ userName: query }, { displayName: query }],
    })
      .limit(limit)
      .lean<AccountDoc[]>();
  }

  async updateAccountByUserName(
    username: string,
    update: Record<string, unknown>,
  ) {
    await Account.updateOne({ userName: username }, update);
  }

  async findAccountsByUserNames(
    usernames: string[],
  ): Promise<AccountDoc[]> {
    return await Account.find({ userName: { $in: usernames } }).lean<
      AccountDoc[]
    >();
  }

  async countAccounts() {
    return await Account.countDocuments({});
  }

  async createEncryptedMessage(data: {
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

  async findEncryptedMessages(
    condition: Record<string, unknown>,
    opts: { before?: string; after?: string; limit?: number } = {},
  ) {
    const query = EncryptedMessage.find(this.withTenant(condition));
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

  async findEncryptedKeyPair(userName: string) {
    return await EncryptedKeyPair.findOne(this.withTenant({ userName })).lean();
  }

  async upsertEncryptedKeyPair(userName: string, content: string) {
    await EncryptedKeyPair.findOneAndUpdate(
      this.withTenant({ userName }),
      { content },
      { upsert: true },
    );
  }

  async deleteEncryptedKeyPair(userName: string) {
    await EncryptedKeyPair.deleteOne(this.withTenant({ userName }));
  }

  async listKeyPackages(userName: string) {
    await this.cleanupKeyPackages(userName);
    return await KeyPackage.find(
      this.withTenant({ userName, used: false }),
    ).lean();
  }

  async findKeyPackage(userName: string, id: string) {
    return await KeyPackage.findOne(
      this.withTenant({ _id: id, userName }),
    ).lean();
  }

  async createKeyPackage(
    userName: string,
    content: string,
    mediaType = "message/mls",
    encoding = "base64",
    groupInfo?: string,
    expiresAt?: Date,
  ) {
    const doc = new KeyPackage(
      this.withTenant({
        userName,
        content,
        mediaType,
        encoding,
        groupInfo,
        expiresAt,
      }),
    );
    (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals =
      {
        env: this.env,
      };
    await doc.save();
    return doc.toObject();
  }

  async markKeyPackageUsed(userName: string, id: string) {
    await KeyPackage.updateOne(
      this.withTenant({ _id: id, userName }),
      { used: true },
    );
  }

  async cleanupKeyPackages(userName: string) {
    await KeyPackage.deleteMany(
      this.withTenant({
        userName,
        $or: [
          { used: true },
          { expiresAt: { $lt: new Date() } },
        ],
      }),
    );
  }

  async deleteKeyPackage(userName: string, id: string) {
    await KeyPackage.deleteOne(this.withTenant({ _id: id, userName }));
  }

  async deleteKeyPackagesByUser(userName: string) {
    await KeyPackage.deleteMany(this.withTenant({ userName }));
  }

  async createHandshakeMessage(data: {
    sender: string;
    recipients: string[];
    message: string;
  }) {
    const doc = new HandshakeMessage(
      this.withTenant({
        sender: data.sender,
        recipients: data.recipients,
        message: data.message,
      }),
    );
    (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals =
      {
        env: this.env,
      };
    await doc.save();
    return doc.toObject();
  }

  async findHandshakeMessages(
    condition: Record<string, unknown>,
    opts: { before?: string; after?: string; limit?: number } = {},
  ) {
    const query = HandshakeMessage.find(
      this.withTenant({ ...condition }),
    );
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

  async listNotifications() {
    return await Notification.find(this.withTenant({}))
      .sort({ createdAt: -1 })
      .lean();
  }

  async createNotification(title: string, message: string, type: string) {
    const doc = new Notification({ title, message, type });
    (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals =
      {
        env: this.env,
      };
    await doc.save();
    return doc.toObject();
  }

  async markNotificationRead(id: string) {
    const res = await Notification.findOneAndUpdate(
      this.withTenant({ _id: id }),
      { read: true },
    );
    return !!res;
  }

  async deleteNotification(id: string) {
    const res = await Notification.findOneAndDelete(
      this.withTenant({ _id: id }),
    );
    return !!res;
  }

  async findRemoteActorByUrl(url: string) {
    return await RemoteActor.findOne({ actorUrl: url }).lean();
  }

  async findRemoteActorsByUrls(urls: string[]) {
    return await RemoteActor.find({ actorUrl: { $in: urls } }).lean();
  }

  async upsertRemoteActor(data: {
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

  async findSystemKey(domain: string) {
    return await SystemKey.findOne({ domain }).lean<
      { domain: string; privateKey: string; publicKey: string } | null
    >();
  }

  async saveSystemKey(
    domain: string,
    privateKey: string,
    publicKey: string,
  ) {
    await SystemKey.create({ domain, privateKey, publicKey });
  }

  async registerFcmToken(token: string, userName: string) {
    await FcmToken.updateOne(
      this.withTenant({ token }),
      { $set: { token, userName } },
      { upsert: true },
    );
  }

  async unregisterFcmToken(token: string) {
    await FcmToken.deleteOne(this.withTenant({ token }));
  }

  async listFcmTokens() {
    const docs = await FcmToken.find(this.withTenant({})).lean<
      { token: string }[]
    >();
    return docs.map((d) => ({ token: d.token }));
  }

  async listInstances(owner: string) {
    const docs = await Instance.find({ owner }).lean<{ host: string }[]>();
    return docs.map((d) => ({ host: d.host }));
  }

  async countInstances(owner: string) {
    return await Instance.countDocuments({ owner });
  }

  async findInstanceByHost(host: string) {
    const doc = await Instance.findOne({ host }).lean<
      {
        _id: mongoose.Types.ObjectId;
        host: string;
        owner: mongoose.Types.ObjectId;
        env?: Record<string, string>;
      } | null
    >();
    return doc
      ? {
        _id: String(doc._id),
        host: doc.host,
        owner: String(doc.owner),
        env: doc.env,
      }
      : null;
  }

  async findInstanceByHostAndOwner(host: string, owner: string) {
    const doc = await Instance.findOne({ host, owner }).lean<
      {
        _id: mongoose.Types.ObjectId;
        host: string;
        env?: Record<string, string>;
      } | null
    >();
    return doc ? { _id: String(doc._id), host: doc.host, env: doc.env } : null;
  }

  async createInstance(
    data: { host: string; owner: string; env?: Record<string, string> },
  ) {
    await Instance.create({
      host: data.host,
      owner: data.owner,
      env: data.env ?? {},
      createdAt: new Date(),
    });
  }

  async updateInstanceEnv(id: string, env: Record<string, string>) {
    await Instance.updateOne({ _id: id }, { $set: { env } });
  }

  async deleteInstance(host: string, owner: string) {
    await Instance.deleteOne({ host, owner });
  }

  async listOAuthClients() {
    const docs = await OAuthClient.find({}).lean<
      { clientId: string; redirectUri: string }[]
    >();
    return docs.map((d) => ({
      clientId: d.clientId,
      redirectUri: d.redirectUri,
    }));
  }

  async findOAuthClient(clientId: string) {
    const doc = await OAuthClient.findOne({ clientId }).lean<
      { clientSecret: string } | null
    >();
    return doc ? { clientSecret: doc.clientSecret } : null;
  }

  async createOAuthClient(
    data: { clientId: string; clientSecret: string; redirectUri: string },
  ) {
    await OAuthClient.create({
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      redirectUri: data.redirectUri,
      createdAt: new Date(),
    });
  }

  async listHostDomains(user: string) {
    const docs = await HostDomain.find({ user }).lean<
      { domain: string; verified: boolean }[]
    >();
    return docs.map((d) => ({ domain: d.domain, verified: d.verified }));
  }

  async findHostDomain(domain: string, user?: string) {
    const cond: Record<string, unknown> = { domain };
    if (user) cond.user = user;
    const doc = await HostDomain.findOne(cond).lean<
      { _id: mongoose.Types.ObjectId; token: string; verified: boolean } | null
    >();
    return doc
      ? { _id: String(doc._id), token: doc.token, verified: doc.verified }
      : null;
  }

  async createHostDomain(domain: string, user: string, token: string) {
    await HostDomain.create({
      domain,
      user,
      token,
      verified: false,
      createdAt: new Date(),
    });
  }

  async verifyHostDomain(id: string) {
    await HostDomain.updateOne({ _id: id }, { $set: { verified: true } });
  }

  async ensureTenant(id: string, domain: string) {
    const exists = await Tenant.findOne({ _id: id }).lean();
    if (!exists) {
      await Tenant.create({ _id: id, domain, created_at: new Date() });
    }
  }

  async createSession(
    sessionId: string,
    expiresAt: Date,
    tenantId: string,
  ): Promise<SessionDoc> {
    const doc = new Session({
      sessionId,
      expiresAt,
      tenant_id: tenantId,
    });
    (doc as unknown as { $locals?: { env?: Record<string, string> } }).$locals =
      {
        env: this.env,
      };
    await doc.save();
    return doc.toObject() as SessionDoc;
  }

  async findSessionById(sessionId: string): Promise<SessionDoc | null> {
    return await Session.findOne({ sessionId }).lean<SessionDoc | null>();
  }

  async deleteSessionById(sessionId: string) {
    await Session.deleteOne({ sessionId });
  }

  async updateSessionExpires(sessionId: string, expires: Date) {
    await Session.updateOne({ sessionId }, { expiresAt: expires });
  }

  async getDatabase() {
    await connectDatabase(this.env);
    return mongoose.connection.db as Db;
  }
}
