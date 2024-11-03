export interface EncryptedDataObject<T> {
  encryptedData: string;
  cipherText: string;
  vi: string;
  encryptedKeyHash: string;
  type: T;
  version: number;
}

export type EncryptedDataAccountKeyObject = EncryptedDataObject<"accountKey">;
export type EncryptedDataKeyShareKeyObject = EncryptedDataObject<"KeyShareKey">;
export type EncryptedDataMigrateKeyObject = EncryptedDataObject<"MigrateKey">;

export interface EncryptedDataDeviceKeyObject {
  encryptedData: string;
  vi: string;
  encryptedKeyHash: string;
  type: "deviceKey";
  version: number;
}

export interface EncryptedDataRoomKeyObject {
  encryptedData: string;
  vi: string;
  encryptedKeyHash: string;
  type: "roomKey";
  version: number;
}
