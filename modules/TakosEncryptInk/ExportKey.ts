export async function exportKeyToPem(
  cryptoKey: CryptoKey,
  type: "accountSignKey" | "accountEnscriptKey" | "roomKey" | "deviceKey",
  keyType: "publicKey" | "private" | "common",
): Promise<string> {
  let exportedKey: ArrayBuffer;

  if (
    type === "accountSignKey" || type === "accountEnscriptKey" ||
    type === "deviceKey"
  ) {
    if (keyType === "publicKey") {
      exportedKey = await crypto.subtle.exportKey("spki", cryptoKey);
    } else if (keyType === "private") {
      exportedKey = await crypto.subtle.exportKey("pkcs8", cryptoKey);
    } else {
      throw new Error(`Unsupported keyType for ${type}: ${keyType}`);
    }
  } else if (type === "roomKey") {
    if (keyType === "common") {
      exportedKey = await crypto.subtle.exportKey("raw", cryptoKey);
    } else if (keyType === "private") {
      exportedKey = await crypto.subtle.exportKey("pkcs8", cryptoKey);
    } else if (keyType === "publicKey") {
      exportedKey = await crypto.subtle.exportKey("spki", cryptoKey);
    } else {
      throw new Error(`Unsupported keyType for roomKey: ${keyType}`);
    }
  } else {
    throw new Error(`Unsupported type: ${type}`);
  }

  const pemKey = convertToPem(exportedKey, keyType);
  return pemKey;
}

function convertToPem(
  exportedKey: ArrayBuffer,
  keyType: "publicKey" | "private" | "common",
): string {
  const exportedAsString = String.fromCharCode(...new Uint8Array(exportedKey));
  const exportedAsBase64 = window.btoa(exportedAsString);

  let typeLabel: string;
  switch (keyType) {
    case "publicKey":
      typeLabel = "PUBLIC KEY";
      break;
    case "private":
      typeLabel = "PRIVATE KEY";
      break;
    case "common":
      typeLabel = "ENCRYPTED PRIVATE KEY";
      break;
    default:
      throw new Error(`Unsupported keyType: ${keyType}`);
  }
  const pemKey = `-----BEGIN ${typeLabel}-----\n${
    exportedAsBase64.match(/.{1,64}/g)?.join("\n")
  }\n-----END ${typeLabel}-----`;

  return pemKey;
}
