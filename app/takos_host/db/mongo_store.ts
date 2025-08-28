import type { HostDataStore, HostUser } from "./types.ts";
import { MongoDB } from "../../takos/db/mongo.ts";
import Tenant from "../models/tenant.ts";
import Instance from "../models/instance.ts";
import OAuthClient from "../models/oauth_client.ts";
import HostDomain from "../models/domain.ts";
import HostUserModel from "../models/user.ts";
import HostSessionModel from "../models/session.ts";
import type mongoose from "mongoose";

/**
 * 既存の MongoDB 実装をホスト用 DataStore に束ねる実装。
 */
export function createMongoDataStore(
  env: Record<string, string>,
  options?: { multiTenant?: boolean },
): HostDataStore {
  const impl = new MongoDB(env);
  const tenantId = env["ACTIVITYPUB_DOMAIN"] ?? "";
  return {
    multiTenant: options?.multiTenant === true,
    tenantId,
    accounts: {
      list: () => impl.listAccounts(),
      create: (d) => impl.createAccount(d),
      findById: (id) => impl.findAccountById(id),
      findByUserName: (u) => impl.findAccountByUserName(u),
      updateById: (id, up) => impl.updateAccountById(id, up),
      deleteById: (id) => impl.deleteAccountById(id),
      addFollower: (id, f) => impl.addFollower(id, f),
      removeFollower: (id, f) => impl.removeFollower(id, f),
      addFollowing: (id, t) => impl.addFollowing(id, t),
      removeFollowing: (id, t) => impl.removeFollowing(id, t),
      addFollowerByName: (u, f) => impl.addFollowerByName(u, f),
      removeFollowerByName: (u, f) => impl.removeFollowerByName(u, f),
      search: (q, l) => impl.searchAccounts(q, l),
      updateByUserName: (u, up) => impl.updateAccountByUserName(u, up),
      findByUserNames: (u) => impl.findAccountsByUserNames(u),
      count: () => impl.countAccounts(),
    },
    posts: {
      findNoteById: (id) => impl.findNoteById(id),
      findMessageById: (id) => impl.findMessageById(id),
      findAttachmentById: (id) => impl.findAttachmentById(id),
      saveObject: (o) => impl.saveObject(o),
      listTimeline: (a, o) => impl.listTimeline(a, o),
      follow: (f, t) => impl.follow(f, t),
      unfollow: (f, t) => impl.unfollow?.(f, t),
      saveNote: (d, a, c, e, aud) => impl.saveNote(d, a, c, e, aud),
      updateNote: (id, up) => impl.updateNote(id, up),
      deleteNote: (id) => impl.deleteNote(id),
      // deno-lint-ignore no-explicit-any
      findNotes: (f, s) => impl.findNotes(f, s as any),
      getPublicNotes: (l, b) => impl.getPublicNotes(l, b),
      saveMessage: (d, a, c, e, aud) => impl.saveMessage(d, a, c, e, aud),
      updateMessage: (id, up) => impl.updateMessage(id, up),
      deleteMessage: (id) => impl.deleteMessage(id),
      // deno-lint-ignore no-explicit-any
      findMessages: (f, s) => impl.findMessages(f, s as any),
      updateObject: (id, up) => impl.updateObject(id, up),
      deleteObject: (id) => impl.deleteObject(id),
      deleteManyObjects: (f) => impl.deleteManyObjects(f),
    },
    dms: {
      save: (
        from,
        to,
        type,
        content,
        attachments,
        url,
        mediaType,
        key,
        iv,
        preview,
      ) =>
        impl.saveDMMessage(
          from,
          to,
          type,
          content,
          attachments,
          url,
          mediaType,
          key,
          iv,
          preview,
        ),
      listBetween: (u1, u2) => impl.listDMsBetween(u1, u2),
      list: (o) => impl.listDirectMessages(o),
      create: (d) => impl.createDirectMessage(d),
      update: (o, id, up) => impl.updateDirectMessage(o, id, up),
      delete: (o, id) => impl.deleteDirectMessage(o, id),
    },
    groups: {
      list: (m) => impl.listGroups(m),
      findByName: (n) => impl.findGroupByName(n),
      create: (d) => impl.createGroup(d),
      updateByName: (n, u) => impl.updateGroupByName(n, u),
      addFollower: (n, a) => impl.addGroupFollower(n, a),
      removeFollower: (n, a) => impl.removeGroupFollower(n, a),
      pushOutbox: (n, act) => impl.pushGroupOutbox(n, act),
    },
    notifications: {
      list: (o) => impl.listNotifications(o),
      create: (o, t, m, ty) => impl.createNotification(o, t, m, ty),
      markRead: (id) => impl.markNotificationRead(id),
      delete: (id) => impl.deleteNotification(id),
    },
    system: {
      findKey: (d) => impl.findSystemKey(d),
      saveKey: (d, pk, pub) => impl.saveSystemKey(d, pk, pub),
      findRemoteActorByUrl: (u) => impl.findRemoteActorByUrl(u),
      findRemoteActorsByUrls: (u) => impl.findRemoteActorsByUrls(u),
      upsertRemoteActor: (data) => impl.upsertRemoteActor(data),
    },
    sessions: {
      create: (id, exp, dev) => impl.createSession(id, exp, dev),
      findById: (id) => impl.findSessionById(id),
      deleteById: (id) => impl.deleteSessionById(id),
      updateExpires: (id, exp) => impl.updateSessionExpires(id, exp),
      updateActivity: (id, d) => impl.updateSessionActivity(id, d),
    },
    fcm: {
      register: (t, u) => impl.registerFcmToken(t, u),
      unregister: (t) => impl.unregisterFcmToken(t),
      list: () => impl.listFcmTokens(),
    },
    tenant: {
      ensure: async (id, domain) => {
        const exists = await Tenant.findOne({ _id: id }).lean();
        if (!exists) {
          const doc = new Tenant({ _id: id, domain, created_at: new Date() });
          await doc.save();
        }
      },
    },
    host: {
      listInstances: async (owner) => {
        const docs = await Instance.find({ owner })
          .lean<{ host: string }[]>();
        return docs.map((d) => ({ host: d.host }));
      },
      countInstances: (owner) => Instance.countDocuments({ owner }),
      findInstanceByHost: async (host) => {
        const doc = await Instance.findOne({ host })
          .lean<
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
      },
      findInstanceByHostAndOwner: async (host, owner) => {
        const doc = await Instance.findOne({ host, owner })
          .lean<
            {
              _id: mongoose.Types.ObjectId;
              host: string;
              env?: Record<string, string>;
            } | null
          >();
        return doc
          ? { _id: String(doc._id), host: doc.host, env: doc.env }
          : null;
      },
      createInstance: async (data) => {
        const doc = new Instance({
          host: data.host,
          owner: data.owner,
          env: data.env ?? {},
          createdAt: new Date(),
        });
        await doc.save();
      },
      updateInstanceEnv: (id, env) =>
        Instance.updateOne({ _id: id }, { $set: { env } }),
      deleteInstance: (host, owner) => Instance.deleteOne({ host, owner }),
    },
    oauth: {
      list: async () => {
        const docs = await OAuthClient.find({})
          .lean<{ clientId: string; redirectUri: string }[]>();
        return docs.map((d) => ({
          clientId: d.clientId,
          redirectUri: d.redirectUri,
        }));
      },
      find: async (id) => {
        const doc = await OAuthClient.findOne({ clientId: id })
          .lean<{ clientSecret: string } | null>();
        return doc ? { clientSecret: doc.clientSecret } : null;
      },
      create: async (data) => {
        const doc = new OAuthClient({
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          redirectUri: data.redirectUri,
          createdAt: new Date(),
        });
        await doc.save();
      },
    },
    domains: {
      list: async (user) => {
        const docs = await HostDomain.find({ user })
          .lean<{ domain: string; verified: boolean }[]>();
        return docs.map((d) => ({ domain: d.domain, verified: d.verified }));
      },
      find: async (domain, user?) => {
        const cond: Record<string, unknown> = { domain };
        if (user) cond.user = user;
        const doc = await HostDomain.findOne(cond)
          .lean<
            | { _id: mongoose.Types.ObjectId; token: string; verified: boolean }
            | null
          >();
        return doc
          ? { _id: String(doc._id), token: doc.token, verified: doc.verified }
          : null;
      },
      create: async (domain, user, token) => {
        const doc = new HostDomain({
          domain,
          user,
          token,
          verified: false,
          createdAt: new Date(),
        });
        await doc.save();
      },
      verify: (id) =>
        HostDomain.updateOne({ _id: id }, { $set: { verified: true } }),
    },
    hostUsers: {
      findByUserName: async (userName) => {
        const doc = await HostUserModel.findOne({ userName })
          .lean<HostUser & { _id: mongoose.Types.ObjectId } | null>();
        return doc ? { ...doc, _id: String(doc._id) } : null;
      },
      findByUserNameOrEmail: async (userName, email) => {
        const doc = await HostUserModel.findOne({
          $or: [{ userName }, { email }],
        })
          .lean<HostUser & { _id: mongoose.Types.ObjectId } | null>();
        return doc ? { ...doc, _id: String(doc._id) } : null;
      },
      create: async (data) => {
        const doc = new HostUserModel({
          userName: data.userName,
          email: data.email,
          hashedPassword: data.hashedPassword,
          salt: data.salt,
          verifyCode: data.verifyCode,
          verifyCodeExpires: data.verifyCodeExpires,
          emailVerified: false,
          createdAt: new Date(),
        });
        await doc.save();
        const obj = doc.toObject() as HostUser & {
          _id: mongoose.Types.ObjectId;
        };
        return { ...obj, _id: String(obj._id) };
      },
      update: async (id, update) => {
        await HostUserModel.updateOne({ _id: id }, { $set: update });
      },
    },
    hostSessions: {
      findById: async (sessionId) => {
        const doc = await HostSessionModel.findOne({ sessionId })
          .lean<
            {
              sessionId: string;
              user: mongoose.Types.ObjectId;
              expiresAt: Date;
            } | null
          >();
        return doc
          ? {
            sessionId: doc.sessionId,
            user: String(doc.user),
            expiresAt: doc.expiresAt,
          }
          : null;
      },
      create: async (sessionId, user, expiresAt) => {
        const doc = new HostSessionModel({
          sessionId,
          user,
          expiresAt,
          createdAt: new Date(),
        });
        await doc.save();
        return { sessionId, user: String(user), expiresAt };
      },
      updateExpires: (sessionId, expiresAt) =>
        HostSessionModel.updateOne({ sessionId }, { $set: { expiresAt } }),
      deleteById: (sessionId) => HostSessionModel.deleteOne({ sessionId }),
    },
    raw: () => impl.getDatabase(),
    // 互換用: 旧 API で使用していた getDatabase を残す
    getDatabase: () => impl.getDatabase(),
  };
}
