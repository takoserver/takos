import { apiFetch } from "../../utils/config.ts";

export interface KeyPackage {
  id: string;
  type: "KeyPackage";
  content: string;
  mediaType: string;
  encoding: string;
  createdAt: string;
}

export interface EncryptedMessage {
  id: string;
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
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    console.error("Error fetching key packages:", err);
    return [];
  }
};

export const addKeyPackage = async (
  user: string,
  pkg: { content: string; mediaType?: string; encoding?: string },
): Promise<string | null> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/keyPackages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pkg),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.keyId === "string" ? data.keyId : null;
  } catch (err) {
    console.error("Error adding key package:", err);
    return null;
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
  user: string,
  data: {
    to: string[];
    content: string;
    mediaType?: string;
    encoding?: string;
    attachments?: unknown[];
  },
): Promise<boolean> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    return res.ok;
  } catch (err) {
    console.error("Error sending message:", err);
    return false;
  }
};

export const fetchEncryptedMessages = async (
  user: string,
  partner?: string,
  params?: { limit?: number; before?: string; after?: string },
): Promise<EncryptedMessage[]> => {
  try {
    const search = new URLSearchParams();
    if (partner) search.set("with", partner);
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.before) search.set("before", params.before);
    if (params?.after) search.set("after", params.after);
    const query = search.toString();
    const url = `/api/users/${encodeURIComponent(user)}/messages${
      query ? `?${query}` : ""
    }`;
    const res = await apiFetch(url);
    if (!res.ok) {
      throw new Error("Failed to fetch messages");
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error fetching messages:", err);
    return [];
  }
};

export interface PublicMessage {
  id: string;
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

export const sendPublicMessage = async (
  user: string,
  data: {
    to: string[];
    content: string;
    mediaType?: string;
    encoding?: string;
    attachments?: unknown[];
  },
): Promise<boolean> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/messages`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    );
    return res.ok;
  } catch (err) {
    console.error("Error sending public message:", err);
    return false;
  }
};

export const fetchPublicMessages = async (
  user: string,
  partner?: string,
  params?: { limit?: number; before?: string; after?: string },
): Promise<PublicMessage[]> => {
  try {
    const search = new URLSearchParams();
    if (partner) search.set("with", partner);
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.before) search.set("before", params.before);
    if (params?.after) search.set("after", params.after);
    const query = search.toString();
    const url = `/api/users/${encodeURIComponent(user)}/messages${
      query ? `?${query}` : ""
    }`;
    const res = await apiFetch(url);
    if (!res.ok) {
      throw new Error("Failed to fetch public messages");
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Error fetching public messages:", err);
    return [];
  }
};

export const fetchEncryptedKeyPair = async (
  user: string,
): Promise<string | null> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/encryptedKeyPair`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.content === "string" ? data.content : null;
  } catch (err) {
    console.error("Error fetching encrypted key pair:", err);
    return null;
  }
};

export const saveEncryptedKeyPair = async (
  user: string,
  content: string,
): Promise<boolean> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/encryptedKeyPair`,
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
): Promise<boolean> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/encryptedKeyPair`,
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

export interface ChatGroup {
  id: string;
  name: string;
  members: string[];
}

export const fetchGroupList = async (
  id: string,
): Promise<ChatGroup[]> => {
  try {
    const res = await apiFetch(`/api/accounts/${id}/groups`);
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    if (data.type === "OrderedCollection" && Array.isArray(data.orderedItems)) {
      // ActivityStreams の Group を内部形式に変換
      return data.orderedItems.map((g: unknown) => {
        const item = g as Record<string, unknown>;
        return {
          id: typeof item.id === "string" ? item.id : "",
          name: typeof item.name === "string" ? item.name : "",
          members: Array.isArray(item.members)
            ? (item.members as unknown[]).filter((m: unknown) =>
              typeof m === "string"
            )
            : [],
        };
      });
    }
    return [];
  } catch (err) {
    console.error("Error fetching group list:", err);
    return [];
  }
};

export const addGroup = async (
  id: string,
  group: ChatGroup,
): Promise<boolean> => {
  try {
    const asGroup = {
      "@context": "https://www.w3.org/ns/activitystreams",
      type: "Group",
      ...group,
    };
    const res = await apiFetch(`/api/accounts/${id}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/activity+json" },
      body: JSON.stringify(asGroup),
    });
    return res.ok;
  } catch (err) {
    console.error("Error adding group:", err);
    return false;
  }
};

export const fetchDmList = async (id: string): Promise<string[]> => {
  try {
    const res = await apiFetch(`/api/accounts/${id}/dms`);
    if (!res.ok) throw new Error("failed");
    const data = await res.json();
    return Array.isArray(data.dms) ? data.dms : [];
  } catch (err) {
    console.error("Error fetching dm list:", err);
    return [];
  }
};

function normalizeActor(actor: string): string {
  if (actor.startsWith("http")) {
    try {
      const url = new URL(actor);
      const name = url.pathname.split("/").pop()!;
      return `${name}@${url.hostname}`;
    } catch {
      return actor;
    }
  }
  return actor;
}

export const addDm = async (id: string, target: string): Promise<boolean> => {
  const handle = normalizeActor(target);
  if (!/^[^@]+@[^@]+$/.test(handle)) {
    console.error("invalid target", target);
    return false;
  }
  try {
    const res = await apiFetch(`/api/accounts/${id}/dms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: handle }),
    });
    return res.ok;
  } catch (err) {
    console.error("Error adding dm:", err);
    return false;
  }
};

export const removeDm = async (
  id: string,
  target: string,
): Promise<boolean> => {
  const handle = normalizeActor(target);
  if (!/^[^@]+@[^@]+$/.test(handle)) {
    console.error("invalid target", target);
    return false;
  }
  try {
    const res = await apiFetch(`/api/accounts/${id}/dms`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: handle }),
    });
    return res.ok;
  } catch (err) {
    console.error("Error removing dm:", err);
    return false;
  }
};

// MLS関連のサーバ通信
export interface MLSProposalPayload {
  type: "add" | "remove";
  member: string;
  keyPackage?: string;
}

export interface MLSCommitPayload {
  epoch: number;
  proposals: MLSProposalPayload[];
}

export interface MLSWelcomePayload {
  epoch: number;
  tree: Record<string, string>;
  secret: string;
}

export const sendProposal = async (
  user: string,
  groupId: string,
  proposal: MLSProposalPayload,
): Promise<boolean> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/groups/${
        encodeURIComponent(groupId)
      }/proposals`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proposal),
      },
    );
    return res.ok;
  } catch (err) {
    console.error("Error sending proposal:", err);
    return false;
  }
};

export const sendCommit = async (
  user: string,
  groupId: string,
  commit: MLSCommitPayload,
): Promise<boolean> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/groups/${
        encodeURIComponent(groupId)
      }/commit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(commit),
      },
    );
    return res.ok;
  } catch (err) {
    console.error("Error sending commit:", err);
    return false;
  }
};

export const fetchWelcome = async (
  user: string,
  groupId: string,
): Promise<MLSWelcomePayload | null> => {
  try {
    const res = await apiFetch(
      `/api/users/${encodeURIComponent(user)}/groups/${
        encodeURIComponent(groupId)
      }/welcome`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data as MLSWelcomePayload;
  } catch (err) {
    console.error("Error fetching welcome:", err);
    return null;
  }
};
