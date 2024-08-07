export default async function generateDeviceKey(): Promise<{
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}> {
  //generate rsa-oaep key pair
  const EncryptKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"],
  );
  return {
    publicKey: EncryptKeyPair.publicKey,
    privateKey: EncryptKeyPair.privateKey,
  };
}
