# 分散型APIの暗号化通信について

## 概要

takosは分散型のAPIを提供しています。このAPIは暗号化通信を行っています。
sslに加え、電子署名を使用して通信の信頼性を高めています。

### 暗号化のソースコード

・暗号鍵生成

```typescript
const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: { name: "SHA-256" },
    },
    true,
    ["sign", "verify"],
  )
  return keyPair
}
```

・署名

```typescript
signData: async (data: string, privateKey: CryptoKey): Promise<ArrayBuffer> => {
  const signAlgorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: { name: "SHA-256" },
  };
  const signature = await window.crypto.subtle.sign(
    signAlgorithm,
    privateKey,
    new TextEncoder().encode(data),
  );
  return signature;
},
```

・検証

```typescript
verifySignature: async (publicKey: CryptoKey, signature: ArrayBuffer, data: string): Promise<boolean> => {
  const signAlgorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: { name: "SHA-256" },
  };
  return await window.crypto.subtle.verify(
    signAlgorithm,
    publicKey,
    signature,
    new TextEncoder().encode(data),
  );
},
```

### リクエストbodyの内容

```typescript
const body = {
    ....
}

// request body
{
    body: JSON.stringify(body),
    signature: await signData(JSON.stringify(body), getPrivateKey()),
    server: ${serverDomain},
}
```

### 電子署名の流れ

1. リクエスト元サーバーは秘密鍵でリクエストを署名します。
2. リクエスト先サーバーはリクエスト元サーバーの公開鍵を取得し、リクエストを検証します。
3. リクエスト先サーバーはレスポンスを秘密鍵で署名します。
4. リクエスト元サーバーはリクエスト先サーバーの公開鍵を取得し、レスポンスを検証します。
