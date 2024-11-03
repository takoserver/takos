import type {
  MasterKeyPrivateObject,
  MasterKeyPublicObject,
} from "../../types/keys.ts";
import { ml_kem768 } from "@noble/post-quantum/ml-kem";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa";
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
} from "../../utils/buffers.ts";

export function generateMasterKeyObject(): {
  public: MasterKeyPublicObject;
  private: MasterKeyPrivateObject;
} {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const key = ml_dsa65.keygen(seed);
  const timestamp = new Date().toISOString();
  const publicKeyString = arrayBufferToBase64(key.publicKey);
  const privateKeyString = arrayBufferToBase64(key.secretKey);

  const publicObject: MasterKeyPublicObject = {
    key: publicKeyString,
    timestamp,
    type: "MasterKeyPublic",
  };
  const privateObject: MasterKeyPrivateObject = {
    key: privateKeyString,
    timestamp,
    type: "MasterKeyPrivate",
  };

  return { public: publicObject, private: privateObject };
}

export function generateMasterKey(): { public: string; private: string } {
  const keys = generateMasterKeyObject();
  return {
    public: JSON.stringify(keys.public),
    private: JSON.stringify(keys.private),
  };
}
