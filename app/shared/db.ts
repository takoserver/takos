import mongoose from "mongoose";
import type { SortOrder } from "mongoose";
import type { Db } from "mongodb";
import type { AccountDoc, RelayDoc, SessionDoc } from "./types.ts";

/** タイムライン取得用オプション */
export interface ListOpts {
  limit?: number;
  before?: Date;
}

/** DB 抽象インターフェース */
export interface DB {
  getObject(id: string): Promise<unknown | null>;
  saveObject(obj: Record<string, unknown>): Promise<unknown>;
  listTimeline(actor: string, opts: ListOpts): Promise<unknown[]>;
  follow(follower: string, target: string): Promise<void>;
  unfollow?(follower: string, target: string): Promise<void>;
  listAccounts(): Promise<AccountDoc[]>;
  createAccount(data: Record<string, unknown>): Promise<AccountDoc>;
  findAccountById(id: string): Promise<AccountDoc | null>;
  findAccountByUserName(username: string): Promise<AccountDoc | null>;
  updateAccountById(
    id: string,
    update: Record<string, unknown>,
  ): Promise<AccountDoc | null>;
  deleteAccountById(id: string): Promise<boolean>;
  addFollower(id: string, follower: string): Promise<string[]>;
  removeFollower(id: string, follower: string): Promise<string[]>;
  addFollowing(id: string, target: string): Promise<string[]>;
  removeFollowing(id: string, target: string): Promise<string[]>;
  listDms(id: string): Promise<string[]>;
  addDm(id: string, target: string): Promise<string[]>;
  removeDm(id: string, target: string): Promise<string[]>;
  saveNote(
    domain: string,
    author: string,
    content: string,
    extra: Record<string, unknown>,
    aud?: { to: string[]; cc: string[] },
  ): Promise<unknown>;
  updateNote(
    id: string,
    update: Record<string, unknown>,
  ): Promise<unknown | null>;
  deleteNote(id: string): Promise<boolean>;
  findNotes(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ): Promise<unknown[]>;
  getPublicNotes(limit: number, before?: Date): Promise<unknown[]>;
  saveVideo(
    domain: string,
    author: string,
    content: string,
    extra: Record<string, unknown>,
    aud?: { to: string[]; cc: string[] },
  ): Promise<unknown>;
  updateVideo(
    id: string,
    update: Record<string, unknown>,
  ): Promise<unknown | null>;
  deleteVideo(id: string): Promise<boolean>;
  findVideos(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ): Promise<unknown[]>;
  saveMessage(
    domain: string,
    author: string,
    content: string,
    extra: Record<string, unknown>,
    aud: { to: string[]; cc: string[] },
  ): Promise<unknown>;
  updateMessage(
    id: string,
    update: Record<string, unknown>,
  ): Promise<unknown | null>;
  deleteMessage(id: string): Promise<boolean>;
  findMessages(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ): Promise<unknown[]>;
  findObjects(
    filter: Record<string, unknown>,
    sort?: Record<string, SortOrder>,
  ): Promise<unknown[]>;
  updateObject(
    id: string,
    update: Record<string, unknown>,
  ): Promise<unknown | null>;
  deleteObject(id: string): Promise<unknown | null>;
  deleteManyObjects(
    filter: Record<string, unknown>,
  ): Promise<{ deletedCount?: number }>;
  listRelays(): Promise<string[]>;
  addRelay(relay: string, inboxUrl?: string): Promise<void>;
  removeRelay(relay: string): Promise<void>;
  addFollowerByName(username: string, follower: string): Promise<void>;
  removeFollowerByName(username: string, follower: string): Promise<void>;
  searchAccounts(query: RegExp, limit?: number): Promise<AccountDoc[]>;
  updateAccountByUserName(
    username: string,
    update: Record<string, unknown>,
  ): Promise<void>;
  findAccountsByUserNames(usernames: string[]): Promise<AccountDoc[]>;
  countAccounts(): Promise<number>;
  createEncryptedMessage(data: {
    from: string;
    to: string[];
    content: string;
    mediaType?: string;
    encoding?: string;
  }): Promise<unknown>;
  findEncryptedMessages(
    condition: Record<string, unknown>,
    opts?: { before?: string; after?: string; limit?: number },
  ): Promise<unknown[]>;
  findEncryptedKeyPair(userName: string): Promise<unknown | null>;
  upsertEncryptedKeyPair(userName: string, content: string): Promise<void>;
  deleteEncryptedKeyPair(userName: string): Promise<void>;
  listKeyPackages(userName: string): Promise<unknown[]>;
  findKeyPackage(userName: string, id: string): Promise<unknown | null>;
  createKeyPackage(
    userName: string,
    content: string,
    mediaType?: string,
    encoding?: string,
  ): Promise<unknown>;
  deleteKeyPackage(userName: string, id: string): Promise<void>;
  deleteKeyPackagesByUser(userName: string): Promise<void>;
  createPublicMessage(data: {
    from: string;
    to: string[];
    content: string;
    mediaType?: string;
    encoding?: string;
  }): Promise<unknown>;
  findPublicMessages(
    condition: Record<string, unknown>,
    opts?: { before?: string; after?: string; limit?: number },
  ): Promise<unknown[]>;
  listNotifications(): Promise<unknown[]>;
  createNotification(
    title: string,
    message: string,
    type: string,
  ): Promise<unknown>;
  markNotificationRead(id: string): Promise<boolean>;
  deleteNotification(id: string): Promise<boolean>;
  findSystemKey(domain: string): Promise<
    {
      domain: string;
      privateKey: string;
      publicKey: string;
    } | null
  >;
  saveSystemKey(
    domain: string,
    privateKey: string,
    publicKey: string,
  ): Promise<void>;
  registerFcmToken(token: string, userName: string): Promise<void>;
  unregisterFcmToken(token: string): Promise<void>;
  listFcmTokens(): Promise<{ token: string }[]>;
  ensureTenant(id: string, domain: string): Promise<void>;
  findRelaysByHosts(hosts: string[]): Promise<RelayDoc[]>;
  findRelayByHost(host: string): Promise<RelayDoc | null>;
  createRelay(data: { host: string; inboxUrl: string }): Promise<RelayDoc>;
  deleteRelayById(id: string): Promise<RelayDoc | null>;
  /** インスタンス一覧取得 */
  listInstances(owner: string): Promise<{ host: string }[]>;
  /** インスタンス数取得 */
  countInstances(owner: string): Promise<number>;
  /** ホスト名でインスタンス検索 */
  findInstanceByHost(
    host: string,
  ): Promise<
    | { _id: string; host: string; owner: string; env?: Record<string, string> }
    | null
  >;
  /** ホスト名と所有者でインスタンス検索 */
  findInstanceByHostAndOwner(
    host: string,
    owner: string,
  ): Promise<
    { _id: string; host: string; env?: Record<string, string> } | null
  >;
  /** インスタンス作成 */
  createInstance(
    data: { host: string; owner: string; env?: Record<string, string> },
  ): Promise<void>;
  /** インスタンス環境変数更新 */
  updateInstanceEnv(id: string, env: Record<string, string>): Promise<void>;
  /** インスタンス削除 */
  deleteInstance(host: string, owner: string): Promise<void>;
  /** OAuth クライアント一覧 */
  listOAuthClients(): Promise<{ clientId: string; redirectUri: string }[]>;
  /** OAuth クライアント検索 */
  findOAuthClient(
    clientId: string,
  ): Promise<{ clientSecret: string } | null>;
  /** OAuth クライアント作成 */
  createOAuthClient(
    data: { clientId: string; clientSecret: string; redirectUri: string },
  ): Promise<void>;
  /** ドメイン一覧取得 */
  listHostDomains(
    user: string,
  ): Promise<{ domain: string; verified: boolean }[]>;
  /** ドメイン検索 */
  findHostDomain(
    domain: string,
    user?: string,
  ): Promise<{ _id: string; token: string; verified: boolean } | null>;
  /** ドメイン登録 */
  createHostDomain(domain: string, user: string, token: string): Promise<void>;
  /** ドメイン認証フラグ更新 */
  verifyHostDomain(id: string): Promise<void>;
  findRemoteActorByUrl(url: string): Promise<unknown | null>;
  findRemoteActorsByUrls(urls: string[]): Promise<unknown[]>;
  upsertRemoteActor(data: {
    actorUrl: string;
    name: string;
    preferredUsername: string;
    icon: unknown;
    summary: string;
  }): Promise<void>;
  createSession(
    sessionId: string,
    expiresAt: Date,
    tenantId: string,
  ): Promise<SessionDoc>;
  findSessionById(sessionId: string): Promise<SessionDoc | null>;
  deleteSessionById(sessionId: string): Promise<void>;
  updateSessionExpires(sessionId: string, expires: Date): Promise<void>;
  getDatabase(): Promise<Db>;
}

let currentUri = "";

export async function connectDatabase(env: Record<string, string>) {
  const uri = env["MONGO_URI"];
  if (!uri) return;
  if (mongoose.connection.readyState === 1 && currentUri === uri) {
    return;
  }
  currentUri = uri;
  // populate の対象パスがスキーマに存在しない場合でもエラーとしない
  mongoose.set("strictPopulate", false);
  await mongoose.connect(uri)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err: Error) => console.error("MongoDB connection error:", err));
}
