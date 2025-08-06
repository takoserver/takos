import { apiFetch } from "../../utils/config.ts";
import { signedFetch } from "../../../../shared/fasp.ts";
import { b64ToBuf } from "../../../../shared/buffer.ts";
import type { FaspRegistrationDoc } from "../../../../shared/types.ts";

/**
 * FASP General/Discovery API クライアント。
 * docs/fasp/general/v0.1/ と docs/fasp/discovery/ を参照。
 */
export interface ProviderInfo {
  name: string;
  capabilities: { id: string; version: string }[];
}

export async function fetchRegistrations(): Promise<FaspRegistrationDoc[]> {
  try {
    const res = await apiFetch("/fasp/registrations");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.registrations) ? data.registrations : [];
  } catch (err) {
    console.error("FASP一覧取得失敗", err);
    return [];
  }
}

export async function approveRegistration(id: string): Promise<boolean> {
  try {
    const res = await apiFetch(`/fasp/registrations/${id}/approve`, {
      method: "POST",
    });
    return res.ok;
  } catch (err) {
    console.error("FASP承認失敗", err);
    return false;
  }
}

export async function fetchProviderInfo(
  baseUrl: string,
): Promise<ProviderInfo | null> {
  try {
    const res = await fetch(new URL("/provider_info", baseUrl));
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("provider_info取得失敗", err);
    return null;
  }
}

export async function toggleCapability(
  reg: FaspRegistrationDoc,
  cap: { id: string; version: string },
  enable: boolean,
): Promise<boolean> {
  try {
    const url = new URL(
      `/capabilities/${cap.id}/${cap.version}/activation`,
      reg.base_url,
    ).toString();
    const key = await crypto.subtle.importKey(
      "pkcs8",
      b64ToBuf(reg.private_key),
      { name: "Ed25519" },
      false,
      ["sign"],
    );
    const body = new Uint8Array();
    const res = await signedFetch({
      method: enable ? "POST" : "DELETE",
      url,
      body,
      key,
      keyId: reg.fasp_id,
    });
    return res.ok;
  } catch (err) {
    console.error("capability切替失敗", err);
    return false;
  }
}
