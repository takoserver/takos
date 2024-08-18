// アルゴリズムはAES-GCM

export function generateRoomKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  )
}

//共通鍵で暗号化vi追加

export async function encryptRoomKey(
  roomKey: CryptoKey,
  data: ArrayBuffer,
): Promise<{
  iv: ArrayBuffer
  encrypted: ArrayBuffer
}> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    roomKey,
    data,
  )
  return {
    iv: iv.buffer,
    encrypted: encrypted,
  }
}

export function decryptRoomKey(
  roomKey: CryptoKey,
  iv: ArrayBuffer,
  encrypted: ArrayBuffer,
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    roomKey,
    encrypted,
  )
}
