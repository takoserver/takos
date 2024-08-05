async function generateAccountKey(): Promise<
  {
    encript: { publicKey: ArrayBuffer; privateKey: ArrayBuffer };
    sign: { publicKey: ArrayBuffer; privateKey: ArrayBuffer };
  }
> {
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
  const publicKey = await crypto.subtle.exportKey(
    "spki",
    EncryptKeyPair.publicKey,
  );
  const privateKey = await crypto.subtle.exportKey(
    "pkcs8",
    EncryptKeyPair.privateKey,
  );
  const SignKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  const signPublicKey = await crypto.subtle.exportKey(
    "spki",
    SignKeyPair.publicKey,
  );
  const signPrivateKey = await crypto.subtle.exportKey(
    "pkcs8",
    SignKeyPair.privateKey,
  );
  return {
    encript: {
      publicKey,
      privateKey,
    },
    sign: {
      publicKey: signPublicKey,
      privateKey: signPrivateKey,
    },
  };
}

export default generateAccountKey;
