import { EncryptedDataKeyShareKeyObject } from "../../types/EncryptedData.ts";

export function isValidEncryptDataKeyShareKey(
  data: EncryptedDataKeyShareKeyObject,
): boolean {
  return data.type === "KeyShareKey" && data.version === 1;
}
