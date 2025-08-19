import { apiFetch } from "../../utils/config.ts";
import {
  decodeGroupInfo,
  decodeMlsMessage,
  encodeCommit,
  encodeProposal,
  encodePublicMessage,
  encodeWelcome,
  type GeneratedKeyPair,
  joinWithGroupInfo,
  type RawKeyPackageInput,
  type RosterEvidence,
  type StoredGroupState,
  updateKey,
  verifyGroupInfo,
  verifyKeyPackage,
  verifyPrivateMessage,
} from "./mls.ts";
import {
  appendKeyPackageRecords,
  appendRosterEvidence,
  loadKeyPackageRecords,
} from "./storage.ts";

const bindingErrorMessages: Record<string, string> = {
  "ap_mls.binding.identity_mismatch":
    "Credentialのidentityがアクターと一致しません",
  "ap_mls.binding.policy_violation": "KeyPackageの形式が不正です",
};

const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const toHex = (arr: Uint8Array): string =>
  Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");

export interface KeyPackage {
  id: string;
  type: "KeyPackage";
  content: string;
  mediaType: string;
  encoding: string;
  groupInfo?: string;
  expiresAt?: string;
  used?: boolean;
  createdAt: string;
  attributedTo?: string;
  deviceId?: string;
  leafSignatureKeyFpr?: string;
  keyPackageRef?: string;
  lastResort?: boolean;
}

export interface EncryptedMessage {
  id: string;
  roomId: string;
  from: string;
  to: string[];
  content: string;
  mediaType: string;
  encoding: string;
  createdAt: string;
  attachments?: {
    url: string;
    mediaType: string;
    key?: string;
    iv?: string;
  }[];
}

export const fetchKeyPackages = async (
  user: string,
  domain?: string,
): Promise<KeyPackage[]> => {
  try {
    const identifier = domain ? `${user}@${domain}` : user;
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(identifier)}/keyPackages`,
    );
    if (!res.ok) {
      throw new Error("Failed to fetch key packages");
    }
    const data = await res.json();
    const items = Array.isArray(data.items) ? data.items : [];
    const result: KeyPackage[] = [];
    for (const item of items) {
      if (typeof item.groupInfo === "string") {
        const bytes = decodeGroupInfo(item.groupInfo);
        if (!bytes || !(await verifyGroupInfo(bytes))) {
          delete item.groupInfo;
        }
      }
      const expected = typeof item.attributedTo === "string"
        ? item.attributedTo
        : domain
        ? `https://${domain}/users/${user}`
        : new URL(`/users/${user}`, globalThis.location.origin).href;
      if (!await verifyKeyPackage(item.content, expected)) {
        continue;
      }
      result.push(item as KeyPackage);
    }
    return result;
  } catch (err) {
    console.error("Error fetching key packages:", err);
    return [];
  }
};

export const addKeyPackage = async (
  user: string,
  pkg: {
    content: string;
    mediaType?: string;
    encoding?: string;
    groupInfo?: string;
    expiresAt?: string;
    lastResort?: boolean;
  },
): Promise<
  { keyId: string | null; groupInfo?: string; keyPackageRef?: string }
> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/keyPackages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pkg),
      },
    );
    if (!res.ok) {
      let msg = "KeyPackageの登録に失敗しました";
      try {
        const err = await res.json();
        if (typeof err.error === "string") {
          msg = bindingErrorMessages[err.error] ?? err.error;
        }
      } catch (_) {
        /* noop */
      }
      throw new Error(msg);
    }
    const data = await res.json();
    let gi = typeof data.groupInfo === "string" ? data.groupInfo : undefined;
    if (gi) {
      const bytes = decodeGroupInfo(gi);
      if (!bytes || !(await verifyGroupInfo(bytes))) {
        gi = undefined;
      }
    }
    return {
      keyId: typeof data.keyId === "string" ? data.keyId : null,
      groupInfo: gi,
      keyPackageRef: typeof data.keyPackageRef === "string"
        ? data.keyPackageRef
        : undefined,
    };
  } catch (err) {
    console.error("Error adding key package:", err);
    if (err instanceof Error) throw err;
    throw new Error("KeyPackageの登録に失敗しました");
  }
};

export const fetchKeyPackage = async (
  user: string,
  keyId: string,
): Promise<KeyPackage | null> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/keyPackages/${
        encodeURIComponent(keyId)
      }`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.groupInfo === "string") {
      const bytes = decodeGroupInfo(data.groupInfo);
      if (!bytes || !(await verifyGroupInfo(bytes))) {
        delete data.groupInfo;
      }
    }
    const expected = typeof data.attributedTo === "string"
      ? data.attributedTo
      : new URL(`/users/${user}`, globalThis.location.origin).href;
    if (!await verifyKeyPackage(data.content, expected)) {
      return null;
    }
    const bytes = b64ToBytes(data.content);
    const decoded = await decodeMlsMessage(bytes, 0);
    const key = (decoded?.[0] as unknown as {
      keyPackage?: { leafNode?: { signaturePublicKey?: Uint8Array } };
    })?.keyPackage?.leafNode?.signaturePublicKey;
    if (key) {
      data.leafSignatureKeyFpr = `ed25519:${toHex(key)}`;
    }
    return data as KeyPackage;
  } catch (err) {
    console.error("Error fetching key package:", err);
    return null;
  }
};

export const markKeyPackagesUsedByRef = async (
  user: string,
  refs: string[],
): Promise<void> => {
  if (!refs.length) return;
  try {
    await apiFetch(
      `/api/users/${encodeURIComponent(user)}/keyPackages/markUsed`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keyPackageRefs: refs }),
      },
    );
  } catch (e) {
    console.warn("markKeyPackagesUsedByRef failed", e);
  }
};

// KeyPackage の URL を指定して Actor とのバインディングを検証しつつ取得する
export const fetchVerifiedKeyPackage = async (
  kpUrl: string,
  candidateActor?: string,
  record?: { accountId: string; roomId: string; leafIndex: number },
): Promise<RawKeyPackageInput | null> => {
  try {
    const res = await fetch(kpUrl, {
      headers: { Accept: "application/activity+json" },
    });
    if (!res.ok) return null;
    const kp = await res.json();
    if (
      typeof kp.attributedTo !== "string" ||
      typeof kp.content !== "string"
    ) {
      return null;
    }
    const actorId = kp.attributedTo;
    if (candidateActor && candidateActor !== actorId) return null;
    const actorRes = await fetch(actorId, {
      headers: { Accept: "application/activity+json" },
    });
    if (!actorRes.ok) return null;
    const actor = await actorRes.json();
    const kpId = typeof kp.id === "string" ? kp.id : kpUrl;
    let listed = false;
    const col = actor.keyPackages;
    if (Array.isArray(col)) {
      listed = col.includes(kpId);
    } else if (col && Array.isArray(col.items)) {
      listed = col.items.includes(kpId);
    }
    if (!listed) return null;
    if (!await verifyKeyPackage(kp.content, actorId)) return null;
    const bytes = b64ToBytes(kp.content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hashHex = toHex(new Uint8Array(hashBuffer));
    let ktIncluded = false;
    try {
      const origin = new URL(kpId).origin;
      const proofRes = await fetch(
        `${origin}/.well-known/key-transparency?hash=${hashHex}`,
      );
      if (proofRes.ok) {
        const proof = await proofRes.json();
        ktIncluded = Boolean(proof?.included);
      }
    } catch {
      // KT 検証に失敗しても致命的ではない
    }
    let fpr: string | undefined = undefined;
    const decoded = await decodeMlsMessage(bytes, 0);
    const key = (decoded?.[0] as unknown as {
      keyPackage?: { leafNode?: { signaturePublicKey?: Uint8Array } };
    })?.keyPackage?.leafNode?.signaturePublicKey;
    if (key) fpr = `ed25519:${toHex(key)}`;

    const result: RawKeyPackageInput = {
      content: kp.content,
      actor: actorId,
      deviceId: typeof kp.deviceId === "string" ? kp.deviceId : undefined,
      url: kpId,
      hash: hashHex,
      leafSignatureKeyFpr: fpr,
      fetchedAt: new Date().toISOString(),
      etag: res.headers.get("ETag") ?? undefined,
      kt: { included: ktIncluded },
    };
    if (record && fpr) {
      await appendKeyPackageRecords(record.accountId, record.roomId, [{
        kpUrl: kpId,
        actorId,
        leafIndex: record.leafIndex,
        credentialFingerprint: fpr,
        time: result.fetchedAt!,
        ktIncluded,
      }]);
    }
    return result;
  } catch (err) {
    console.error("KeyPackage の検証に失敗しました:", err);
    return null;
  }
};

export const fetchGroupInfo = async (
  user: string,
  keyId: string,
): Promise<string | null> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/keyPackages/${
        encodeURIComponent(keyId)
      }`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.groupInfo === "string") {
      const bytes = decodeGroupInfo(data.groupInfo);
      if (bytes && (await verifyGroupInfo(bytes))) {
        return data.groupInfo;
      }
    }
    return null;
  } catch (err) {
    console.error("Error fetching group info:", err);
    return null;
  }
};

// RosterEvidence を検証する
export const importRosterEvidence = async (
  accountId: string,
  roomId: string,
  evidence: RosterEvidence,
  leafIndex = -1,
): Promise<boolean> => {
  try {
    const res = await fetch(evidence.keyPackageUrl, {
      headers: { Accept: "application/activity+json" },
    });
    if (!res.ok) return false;
    const kp = await res.json();
    if (typeof kp.content !== "string" || kp.attributedTo !== evidence.actor) {
      return false;
    }
    const bytes = b64ToBytes(kp.content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    const hashHex = toHex(new Uint8Array(hashBuffer));
    if (`sha256:${hashHex}` !== evidence.keyPackageHash) return false;
    const decoded = await decodeMlsMessage(bytes, 0);
    const key = (decoded?.[0] as unknown as {
      keyPackage?: { leafNode?: { signaturePublicKey?: Uint8Array } };
    })?.keyPackage?.leafNode?.signaturePublicKey;
    if (!key || `ed25519:${toHex(key)}` !== evidence.leafSignatureKeyFpr) {
      return false;
    }
    if (!await verifyKeyPackage(kp.content, evidence.actor)) return false;
    await appendKeyPackageRecords(accountId, roomId, [{
      kpUrl: evidence.keyPackageUrl,
      actorId: evidence.actor,
      leafIndex,
      credentialFingerprint: evidence.leafSignatureKeyFpr,
      time: evidence.fetchedAt,
      ktIncluded: false,
    }]);
    return true;
  } catch (err) {
    console.error("RosterEvidence の検証に失敗しました:", err);
    return false;
  }
};

export const deleteKeyPackage = async (
  user: string,
  keyId: string,
): Promise<boolean> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/keyPackages/${
        encodeURIComponent(keyId)
      }`,
      { method: "DELETE" },
    );
    return res.ok;
  } catch (err) {
    console.error("Error deleting key package:", err);
    return false;
  }
};

export const sendEncryptedMessage = async (
  roomId: string,
  from: string,
  to: string[],
  data: {
    content: string;
    mediaType?: string;
    encoding?: string;
    attachments?: unknown[];
  },
): Promise<boolean> => {
  try {
    const payload: Record<string, unknown> = {
      from,
      to,
      content: data.content,
      mediaType: data.mediaType ?? "message/mls",
      encoding: data.encoding ?? "base64",
    };
    if (data.attachments) payload.attachments = data.attachments;
    const res = await apiFetch(
      `/api/rooms/${encodeURIComponent(roomId)}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    return res.ok;
  } catch (err) {
    console.error("Error sending message:", err);
    return false;
  }
};

export const fetchEncryptedMessages = async (
  roomId: string,
  member: string,
  params?: { limit?: number; before?: string; after?: string },
): Promise<EncryptedMessage[]> => {
  try {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.before) search.set("before", params.before);
    if (params?.after) search.set("after", params.after);
    search.set("member", member);
    const query = search.toString();
    const url = `/api/rooms/${encodeURIComponent(roomId)}/messages${
      query ? `?${query}` : ""
    }`;
    const res = await apiFetch(url);
    if (!res.ok) {
      throw new Error("Failed to fetch messages");
    }
    const data = await res.json();
    console.debug("[fetchEncryptedMessages]", {
      roomId,
      member,
      params,
      count: Array.isArray(data) ? data.length : undefined,
      raw: data,
    });
    if (!Array.isArray(data)) return [];
    const result: EncryptedMessage[] = [];
    for (const msg of data) {
      if (
        msg &&
        typeof msg === "object" &&
        (msg as { mediaType?: unknown }).mediaType === "message/mls" &&
        (msg as { encoding?: unknown }).encoding === "base64"
      ) {
        const raw = b64ToBytes((msg as { content: string }).content);
        if (!await verifyPrivateMessage(raw)) {
          console.warn(
            "[fetchEncryptedMessages] 署名検証に失敗しました",
            msg,
          );
          continue;
        }
        result.push(msg as EncryptedMessage);
      } else {
        console.warn(
          "[fetchEncryptedMessages] 不正なメッセージを破棄しました",
          msg,
        );
      }
    }
    return result;
  } catch (err) {
    console.error("Error fetching messages:", err);
    return [];
  }
};

export interface HandshakeMessage {
  id: string;
  roomId: string;
  sender: string;
  recipients: string[];
  message: string;
  createdAt: string;
}

export const sendHandshake = async (
  roomId: string,
  from: string,
  content: string,
  to?: string[],
  opts?: { deviceMap?: Record<string, string> },
): Promise<boolean> => {
  try {
    const payload: Record<string, unknown> = {
      from,
      content,
      mediaType: "message/mls",
      encoding: "base64",
    };
    if (Array.isArray(to)) {
      // 送信先（MLS ロスター由来）を明示し、サーバー側の検証/配送に使用する
      payload.to = to;
    }
    if (opts?.deviceMap && typeof opts.deviceMap === "object") {
      payload.deviceMap = opts.deviceMap;
    }
    const res = await apiFetch(
      `/api/rooms/${encodeURIComponent(roomId)}/handshakes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      let body: unknown = null;
      try {
        body = await res.json();
      } catch { /* ignore */ }
      console.warn("[sendHandshake] failed", {
        roomId,
        status: res.status,
        from,
        to,
        body,
      });
    } else {
      try {
        const data: unknown = await res.clone().json();
        const partial = (data && typeof data === "object" && "partial" in data)
          ? (data as { partial?: unknown }).partial
          : undefined;
        const unresolved =
          (data && typeof data === "object" && "unresolved" in data)
            ? (data as { unresolved?: unknown }).unresolved
            : undefined;
        console.info("[sendHandshake] ok", {
          roomId,
          from,
          toCount: Array.isArray(to) ? to.length : undefined,
          partial,
          unresolved,
        });
      } catch {
        console.info("[sendHandshake] ok(no-json)", { roomId, from });
      }
    }
    return res.ok;
  } catch (err) {
    console.error("Error sending handshake:", err);
    return false;
  }
};

export const removeRoomMembers = async (
  roomId: string,
  from: string,
  targets: string[],
): Promise<string | null> => {
  try {
    const res = await apiFetch(
      `/api/rooms/${encodeURIComponent(roomId)}/remove`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, targets }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.commit === "string" ? data.commit : null;
  } catch (err) {
    console.error("Error removing members:", err);
    return null;
  }
};

type UpdateResult = Awaited<ReturnType<typeof updateKey>>;

export const updateRoomKey = async (
  roomId: string,
  from: string,
  identity: string,
  state: StoredGroupState,
): Promise<UpdateResult | null> => {
  try {
    const records = await loadKeyPackageRecords(from, roomId);
    const rec = records.find((r) => r.actorId === identity);
    if (!rec) {
      throw new Error("保存済みの actorId と一致しません");
    }
    const res = await updateKey(state, identity);
    const content = encodeCommit(res.commit);
    const ok = await sendHandshake(roomId, from, content);
    if (!ok) return null;
    return res;
  } catch (err) {
    console.error("Error updating room key:", err);
    return null;
  }
};

export const joinGroupWithInfo = async (
  roomId: string,
  from: string,
  groupInfo: string,
  keyPair: GeneratedKeyPair,
): Promise<{ state: StoredGroupState } | null> => {
  try {
    const infoBytes = decodeGroupInfo(groupInfo);
    if (!infoBytes) return null;
    const res = await joinWithGroupInfo(infoBytes, keyPair);
    const ok = await sendHandshake(roomId, from, res.commit);
    if (!ok) return null;
    return { state: res.state };
  } catch (err) {
    console.error("Error joining with group info:", err);
    return null;
  }
};

export const fetchHandshakes = async (
  roomId: string,
  params?: { limit?: number; before?: string; after?: string },
): Promise<HandshakeMessage[]> => {
  try {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.before) search.set("before", params.before);
    if (params?.after) search.set("after", params.after);
    const query = search.toString();
    const url = `/api/rooms/${encodeURIComponent(roomId)}/handshakes${
      query ? `?${query}` : ""
    }`;
    const res = await apiFetch(url);
    if (!res.ok) {
      throw new Error("Failed to fetch handshakes");
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error fetching handshakes:", err);
    return [];
  }
};

export const fetchEncryptedKeyPair = async (
  user: string,
  deviceId: string,
): Promise<string | null> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/devices/${
        encodeURIComponent(deviceId)
      }/encryptedKeyPair`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.content === "string" ? data.content : null;
  } catch (err) {
    console.error("Error fetching encrypted key pair:", err);
    return null;
  }
};

// ローカルユーザー向けの保留中招待一覧を取得
export const fetchPendingInvites = async (
  user: string,
): Promise<
  { roomId: string; deviceId?: string; expiresAt?: string; acked?: boolean }[]
> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/pendingInvites`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data)
      ? data
        .map((d: unknown) => {
          const o = d as Record<string, unknown>;
          return {
            roomId: typeof o.roomId === "string" ? o.roomId : "",
            deviceId: typeof o.deviceId === "string" ? o.deviceId : undefined,
            expiresAt: typeof o.expiresAt === "string"
              ? o.expiresAt
              : undefined,
            acked: typeof o.acked === "boolean" ? o.acked : undefined,
          };
        })
        .filter((x) => x.roomId !== "")
      : [];
  } catch (err) {
    console.error("Error fetching pending invites:", err);
    return [];
  }
};

// 統合イベントAPI（ActivityPub前提のサーバ側集約を想定）
export interface UnifiedEvent {
  id: string;
  type: "handshake" | "encryptedMessage" | "publicMessage";
  roomId: string;
  from: string;
  to: string[];
  createdAt: string;
}

export const fetchEvents = async (
  params?: { since?: string; limit?: number; types?: string[] },
): Promise<UnifiedEvent[]> => {
  try {
    const search = new URLSearchParams();
    if (params?.since) search.set("since", params.since);
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.types?.length) search.set("types", params.types.join(","));
    const url = `/api/events${
      search.toString() ? `?${search.toString()}` : ""
    }`;
    const res = await apiFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data as UnifiedEvent[] : [];
  } catch (err) {
    console.error("Error fetching events:", err);
    return [];
  }
};

export const saveEncryptedKeyPair = async (
  user: string,
  deviceId: string,
  content: string,
): Promise<boolean> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/devices/${
        encodeURIComponent(deviceId)
      }/encryptedKeyPair`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      },
    );
    return res.ok;
  } catch (err) {
    console.error("Error saving encrypted key pair:", err);
    return false;
  }
};

export const deleteEncryptedKeyPair = async (
  user: string,
  deviceId: string,
): Promise<boolean> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/devices/${
        encodeURIComponent(deviceId)
      }/encryptedKeyPair`,
      { method: "DELETE" },
    );
    return res.ok;
  } catch (err) {
    console.error("Error deleting encrypted key pair:", err);
    return false;
  }
};

export const uploadFile = async (
  data: {
    content: ArrayBuffer;
    mediaType?: string;
    key?: string;
    iv?: string;
    name?: string;
  },
): Promise<string | null> => {
  try {
    const form = new FormData();
    form.append(
      "file",
      new Blob([data.content], { type: data.mediaType }),
      data.name ?? "file",
    );
    if (data.key) form.append("key", data.key);
    if (data.iv) form.append("iv", data.iv);
    const res = await apiFetch("/api/files", {
      method: "POST",
      body: form,
    });
    if (!res.ok) return null;
    const d = await res.json();
    return typeof d.url === "string" ? d.url : null;
  } catch (err) {
    console.error("Error uploading attachment:", err);
    return null;
  }
};

export const resetKeyData = async (user: string): Promise<boolean> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/resetKeys`,
      { method: "POST" },
    );
    return res.ok;
  } catch (err) {
    console.error("Error resetting key data:", err);
    return false;
  }
};

export interface Room {
  id: string;
  // サーバーへ送信するメタデータ
  name?: string;
  icon?: string;
  members?: string[];
}

export interface RoomsSearchItem {
  id: string;
  status: "joined" | "invited";
  name?: string;
  icon?: string;
}

export const searchRooms = async (
  userName: string,
  params?: {
    participants?: string[];
    match?: "all" | "any" | "none";
    hasName?: boolean;
    hasIcon?: boolean;
    members?: string; // e.g., "eq:2", "ge:3"
    // 暗黙（メッセージ履歴から推定）のルームの扱い
    implicit?: "include" | "exclude" | "only";
  },
): Promise<RoomsSearchItem[]> => {
  try {
    const search = new URLSearchParams();
    search.set("userName", userName);
    if (params?.participants?.length) {
      search.set("participants", params.participants.join(","));
    }
    if (params?.match) search.set("match", params.match);
    if (typeof params?.hasName === "boolean") {
      search.set("hasName", String(params.hasName));
    }
    if (typeof params?.hasIcon === "boolean") {
      search.set("hasIcon", String(params.hasIcon));
    }
    if (params?.members) search.set("members", params.members);
    if (params?.implicit) search.set("implicit", params.implicit);
    const res = await apiFetch(`/api/rooms?${search.toString()}`);
    if (!res.ok) throw new Error("failed to search rooms");
    const data = await res.json();
    return Array.isArray(data.rooms)
      ? data.rooms.map((r: unknown) => {
        if (r && typeof r === "object" && "id" in r) {
          // deno-lint-ignore no-explicit-any
          const obj = r as any;
          const status = obj.status === "invited" ? "invited" : "joined";
          const name = typeof obj.name === "string" ? obj.name : undefined;
          const icon = typeof obj.icon === "string" ? obj.icon : undefined;
          return { id: String(obj.id), status, name, icon };
        }
        return { id: "", status: "joined" };
      }).filter((r: RoomsSearchItem) => r.id !== "")
      : [];
  } catch (err) {
    console.error("Error searching rooms:", err);
    return [];
  }
};

export const addRoom = async (
  userName: string,
  room: Room,
  handshake?: {
    from: string;
    content: string;
    mediaType?: string;
    encoding?: string;
    to?: string[]; // recipients (ハンドシェイク時必須)
  },
): Promise<boolean> => {
  try {
    const body: Record<string, unknown> = { userName, id: room.id };
    if (room.name) body.name = room.name;
    if (room.icon) body.icon = room.icon;
    if (handshake) {
      body.handshake = {
        from: handshake.from,
        content: handshake.content,
        mediaType: handshake.mediaType ?? "message/mls",
        encoding: handshake.encoding ?? "base64",
        to: Array.isArray(handshake.to)
          ? handshake.to
          : (room.members ?? []).filter((m): m is string =>
            typeof m === "string"
          ),
      };
    }
    const res = await apiFetch(`/api/ap/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (err) {
    console.error("Error adding room:", err);
    return false;
  }
};

export const updateRoomMember = async (
  roomId: string,
  action: "Add" | "Remove",
  member: string,
): Promise<boolean> => {
  try {
    const res = await apiFetch(`/api/ap/rooms/${roomId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: action, object: member }),
    });
    return res.ok;
  } catch (err) {
    console.error("Error updating member:", err);
    return false;
  }
};

export const addRoomMember = async (
  roomId: string,
  member: string,
): Promise<boolean> => {
  return await updateRoomMember(roomId, "Add", member);
};

export const removeRoomMember = async (
  roomId: string,
  member: string,
): Promise<boolean> => {
  return await updateRoomMember(roomId, "Remove", member);
};

export interface KeepMessage {
  id: string;
  content: string;
  createdAt: string;
}

export const fetchKeepMessages = async (
  user: string,
  params?: { limit?: number; before?: string; after?: string },
): Promise<KeepMessage[]> => {
  try {
    const search = new URLSearchParams();
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.before) search.set("before", params.before);
    if (params?.after) search.set("after", params.after);
    const query = search.toString();
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/keep${query ? `?${query}` : ""}`,
    );
    if (!res.ok) throw new Error("failed to fetch keep messages");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error fetching keep messages:", err);
    return [];
  }
};

export const sendKeepMessage = async (
  user: string,
  content: string,
): Promise<KeepMessage | null> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/keep`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      },
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("Error sending keep message:", err);
    return null;
  }
};

// MLS関連のサーバ通信
export interface MLSProposalPayload {
  type: "add" | "remove";
  member: string;
  keyPackage?: string;
}

export interface MLSWelcomePayload {
  type: "welcome";
  member: string;
  epoch: number;
  tree: Record<string, string>;
  secret: string;
}

export interface MLSCommitPayload {
  type: "commit";
  epoch: number;
  proposals: MLSProposalPayload[];
  welcomes?: MLSWelcomePayload[];
  evidences?: RosterEvidence[];
}

export const sendProposal = async (
  roomId: string,
  from: string,
  proposal: MLSProposalPayload,
): Promise<boolean> => {
  const content = encodeProposal(
    new TextEncoder().encode(JSON.stringify(proposal)),
  );
  return await sendHandshake(roomId, from, content);
};

export const sendCommit = async (
  roomId: string,
  from: string,
  commit: MLSCommitPayload,
): Promise<boolean> => {
  const content = encodeCommit(
    new TextEncoder().encode(JSON.stringify(commit)),
  );
  const ok = await sendHandshake(roomId, from, content);
  if (!ok) return false;
  if (commit.welcomes) {
    for (const w of commit.welcomes) {
      const wContent = encodeWelcome(
        new TextEncoder().encode(JSON.stringify(w)),
      );
      const success = await sendHandshake(roomId, from, wContent);
      if (!success) return false;
    }
  }
  if (commit.evidences) {
    for (const ev of commit.evidences) {
      // Evidence は現状汎用 PublicMessage として扱う（サーバーは型で招待生成しない）
      const evContent = encodePublicMessage(
        new TextEncoder().encode(JSON.stringify(ev)),
      );
      const okEv = await sendHandshake(roomId, from, evContent);
      if (!okEv) return false;
      const verified = await importRosterEvidence(from, roomId, ev);
      if (verified) {
        await appendRosterEvidence(from, roomId, [ev]);
      }
    }
  }
  return true;
};
