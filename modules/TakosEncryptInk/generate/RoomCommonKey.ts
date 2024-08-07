//DH鍵交換を利用して、部屋共通鍵を生成する
//          name: "ECDH",
//namedCurve: "P-256" // 使用する楕円曲線

async function generateRoomKeyCommon(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey> {
  const sharedKey = await window.crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
  return sharedKey;
}

export default generateRoomKeyCommon;
