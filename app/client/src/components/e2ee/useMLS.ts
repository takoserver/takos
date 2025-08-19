import { createSignal } from "solid-js";
import { addKeyPackage } from "./api.ts";
import { generateKeyPair, type RosterEvidence } from "./mls.ts";
import { loadKeyPackageRecords, loadRosterEvidence } from "./storage.ts";

export type BindingStatus = "Verified" | "BoundOnly" | "Unbound";

/**
 * Evidence と Credential の一致状況からバインディング状態を判定する
 */
export function evaluateBinding(
  credentialActor: string | undefined,
  leafSignatureKeyFpr: string,
  evidences: RosterEvidence[],
): BindingStatus {
  const ev = evidences.find((e) =>
    e.leafSignatureKeyFpr === leafSignatureKeyFpr
  );
  if (!ev) return "Unbound";
  return credentialActor === ev.actor ? "Verified" : "BoundOnly";
}

/**
 * 判定結果に応じて表示用ラベルと注意文言を返す
 */
export function bindingMessage(
  status: BindingStatus,
): { label: string; caution?: string } {
  switch (status) {
    case "Verified":
      return { label: "検証済み" };
    case "BoundOnly":
      return {
        label: "バインドのみ",
        caution: "鍵の出所はサーバ経由。指紋確認で検証可",
      };
    default:
      return {
        label: "未リンクの端末",
        caution: "指紋の確認を推奨します",
      };
  }
}

export function useMLS(userName: string) {
  const [status, setStatus] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [bindingStatus, setBindingStatus] = createSignal<BindingStatus | null>(
    null,
  );
  const [bindingInfo, setBindingInfo] = createSignal<
    { label: string; caution?: string } | null
  >(null);
  const [ktInfo, setKtInfo] = createSignal<{ included: boolean } | null>(null);

  const generateKeys = async () => {
    try {
      setStatus("鍵を生成中...");
      setError(null);
      // BasicCredential.identity に Actor の URL を設定する
      const actorId =
        new URL(`/users/${userName}`, globalThis.location.origin).href;
      const kp = await generateKeyPair(actorId);
      await addKeyPackage(userName, { content: kp.encoded });
      setStatus("鍵を生成しました");
    } catch (err) {
      console.error("鍵生成に失敗しました", err);
      setStatus(null);
      setError(
        err instanceof Error ? err.message : "鍵生成に失敗しました",
      );
    }
  };

  const assessBinding = async (
    accountId: string,
    roomId: string,
    credentialActor: string | undefined,
    leafSignatureKeyFpr: string,
    ktIncluded?: boolean,
  ) => {
    const evidences = await loadRosterEvidence(accountId, roomId);
    const result = evaluateBinding(
      credentialActor,
      leafSignatureKeyFpr,
      evidences,
    );
    setBindingStatus(result);
    setBindingInfo(bindingMessage(result));
    setKtInfo({ included: ktIncluded ?? false });
  };

  const assessMemberBinding = async (
    accountId: string,
    roomId: string,
    credentialActor: string | undefined,
    leafSignatureKeyFpr: string,
  ) => {
    const evidences = await loadRosterEvidence(accountId, roomId);
    const result = evaluateBinding(
      credentialActor,
      leafSignatureKeyFpr,
      evidences,
    );
    const records = await loadKeyPackageRecords(accountId, roomId);
    const rec = records.find((r) =>
      r.credentialFingerprint === leafSignatureKeyFpr &&
      (!credentialActor || r.actorId === credentialActor)
    );
    return {
      status: result,
      info: bindingMessage(result),
      kt: { included: rec?.ktIncluded ?? false },
    };
  };

  return {
    generateKeys,
    status,
    error,
    bindingStatus,
    bindingInfo,
    ktInfo,
    assessBinding,
    assessMemberBinding,
  };
}
