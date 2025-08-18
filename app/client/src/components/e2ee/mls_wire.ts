// 簡易ワイヤメッセージ判別 (openmls wasm 移行暫定)
// 本来は openmls のパーサを wasm から公開して利用すべきだが、
// 移行初期段階として Base64 長さや先頭バイト種別で最低限のフィルタを行う。

export type WireKind =
  | "unknown"
  | "mls_key_package"
  | "mls_private_message"
  | "mls_welcome"
  | "mls_group_info"
  | "mls_public_message";

export interface DecodedWirePeek {
  kind: WireKind;
  raw: Uint8Array;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// 暫定: openmls の tls framing を厳密に解釈せず先頭種別バイトをヒューリスティック判定
// 必要に応じて Rust 側で decode API を追加し差し替える
export function peekWire(b64: string): DecodedWirePeek | null {
  try {
    const raw = b64ToBytes(b64);
    if (raw.length < 2) return { kind: "unknown", raw };
    // 簡易: 仕様で wireformat enum を参照できないため長さなどから分類は避ける
    // ここでは利用箇所が "private_message か? welcome か? group_info か?" 程度なので
    // プレーンに unknown を返し、呼び出し側で fallback する方式
    return { kind: "unknown", raw };
  } catch {
    return null;
  }
}
