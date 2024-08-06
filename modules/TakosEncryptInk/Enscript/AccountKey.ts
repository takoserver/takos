//秘密鍵によってデータを暗号化する
async function EnscriptTextData(
  data: string,
  privateKey: ArrayBuffer,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    privateKey,
    {
      name: "RSA-OAEP",
    },
    false,
    ["encrypt"],
  );

  return await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    key,
    new TextEncoder().encode(data),
  );
}
async function EnscriptData(
  data: ArrayBuffer,
  privateKey: ArrayBuffer,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    privateKey,
    {
      name: "RSA-OAEP",
    },
    false,
    ["encrypt"],
  );
  return await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    key,
    data,
  );
}
async function DecriptTextData(
  data: ArrayBuffer,
  publicKey: ArrayBuffer,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    publicKey,
    {
      name: "RSA-OAEP",
    },
    false,
    ["decrypt"],
  );

  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      key,
      data,
    ),
  );
}
async function DecriptData(
  data: ArrayBuffer,
  publicKey: ArrayBuffer,
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    publicKey,
    {
      name: "RSA-OAEP",
    },
    false,
    ["decrypt"],
  );
  return await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    key,
    data,
  );
}

export { DecriptData, DecriptTextData, EnscriptData, EnscriptTextData };
