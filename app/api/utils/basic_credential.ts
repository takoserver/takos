function readUint16(view: DataView, pos: number): [number, number] {
  if (pos + 2 > view.byteLength) throw new Error("out of range");
  return [view.getUint16(pos, false), pos + 2];
}

function readOpaque(
  view: DataView,
  buf: Uint8Array,
  pos: number,
): [Uint8Array, number] {
  const [len, p] = readUint16(view, pos);
  if (p + len > view.byteLength) throw new Error("out of range");
  return [buf.subarray(p, p + len), p + len];
}

/**
 * KeyPackage バイナリから BasicCredential.identity を抽出する
 * @param kp キーパッケージのバイト列
 * @returns identity 文字列。解析できない場合は null
 */
export function extractBasicCredentialIdentity(
  kp: Uint8Array,
  opts?: { debug?: boolean },
): string | null {
  const debug = opts?.debug;
  // Detect MLS envelope (type + 2-byte length) and strip if present.
  // For a KeyPackage envelope: first byte should be 4.
  try {
    if (kp.length >= 5) { // need at least type + len(2) + version(2)
      const typeByte = kp[0];
      const declaredLen = (kp[1] << 8) | kp[2];
      if (
        (typeByte === 4 || typeByte === 0x04) &&
        declaredLen <= kp.length - 3 &&
        // Heuristic: version field (first 2 bytes after envelope) should be small (e.g., 0x0001)
        kp[3] === 0x00 && (kp[4] === 0x01 || kp[4] === 0x00)
      ) {
        if (debug) console.debug("[extractBasicCredentialIdentity] Stripping MLS envelope", { declaredLen, total: kp.length });
        kp = kp.subarray(3, 3 + declaredLen); // narrow slice to payload
      }
    }
  } catch (e) {
    if (debug) console.debug("[extractBasicCredentialIdentity] envelope detection failed", e);
  }
  try {
    const view = new DataView(kp.buffer, kp.byteOffset, kp.byteLength);
    let pos = 0;
    const startDump = Array.from(kp.slice(0, 16)).map((b) => b.toString(16).padStart(2, "0")).join(" ");
    // KeyPackageHeader
    const [version, pV] = readUint16(view, pos); pos = pV;
    const [cipherSuite, pC] = readUint16(view, pos); pos = pC;
    const [initKey, pIK] = readOpaque(view, kp, pos); pos = pIK;
    const [encryptionKey, pEK] = readOpaque(view, kp, pos); pos = pEK;
    const [signatureKey, pSK] = readOpaque(view, kp, pos); pos = pSK;
    const [credType, p2] = readUint16(view, pos); pos = p2;
    if (credType !== 1) {
      if (debug) console.debug("[extractBasicCredentialIdentity] unsupported credential type", { credType });
      return null; // Not BasicCredential
    }
    const [identity, p3] = readOpaque(view, kp, pos); pos = p3;
    const idStr = new TextDecoder().decode(identity);
    if (debug) {
      console.debug("[extractBasicCredentialIdentity] parsed", {
        version,
        cipherSuite,
        initKeyLen: initKey.length,
        encryptionKeyLen: encryptionKey.length,
        signatureKeyLen: signatureKey.length,
        credType,
        identity: idStr,
        totalLen: kp.length,
        startDump,
      });
    }
    return idStr;
  } catch (e) {
    if (debug) console.debug("[extractBasicCredentialIdentity] parse failed", e);
    // Heuristic fallback: scan raw bytes for an ASCII URL like https://.../users/...
    try {
      const ascii = Array.from(kp).map((b) => (b >= 0x20 && b <= 0x7e) ? String.fromCharCode(b) : "\u0000").join("");
      // Split on NUL-ish placeholders to reduce noise
      // Split manually on null chars to avoid regex control char lint issue
      const segments: string[] = [];
      let current = "";
      for (let i = 0; i < ascii.length; i++) {
        const ch = ascii[i];
        if (ch === "\u0000") {
          if (current) {
            segments.push(current);
            current = "";
          }
        } else {
          current += ch;
        }
      }
      if (current) segments.push(current);
      const filtered = segments.filter((s) => s.includes("https://") && s.includes("/users/"));
      for (const seg of filtered) {
        const match = seg.match(/https:\/\/[^\s"'<>]+\/users\/[A-Za-z0-9._-]+/);
        if (match) {
          const candidate = match[0];
          if (debug) console.debug("[extractBasicCredentialIdentity] heuristic match", { candidate });
          return candidate;
        }
      }
    } catch (scanErr) {
      if (debug) console.debug("[extractBasicCredentialIdentity] heuristic scan failed", scanErr);
    }
    return null;
  }
}
