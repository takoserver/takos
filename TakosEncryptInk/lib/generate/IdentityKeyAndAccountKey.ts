import type {
  AccountKeyPrivateObject,
  AccountKeyPublicObject,
  IdentityKeyPrivateObject,
  IdentityKeyPublicObject,
  MasterKeyPrivateObject,
  MasterKeyPublicObject,
} from "../../types/keys.ts"
import { ml_kem768 } from "@noble/post-quantum/ml-kem"
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa"
import { arrayBufferToBase64 } from "../../utils/buffers.ts"
import { sign } from "../../utils/sign.ts"

export function generateIdentityKeyAndAccountKeyObject(): {
  identityKey: { public: IdentityKeyPublicObject; private: IdentityKeyPrivateObject }
  accountKey: { public: AccountKeyPublicObject; private: AccountKeyPrivateObject }
} {
  const seed = crypto.getRandomValues(new Uint8Array(32))
  const idenKey = ml_dsa65.keygen(seed)
  const accKey = ml_kem768.keygen()
  const identityPublicKeyString = arrayBufferToBase64(idenKey.publicKey)
  const identityPrivateKeyString = arrayBufferToBase64(idenKey.secretKey)
  const accountPublicKeyString = arrayBufferToBase64(accKey.publicKey)
  const accountPrivateKeyString = arrayBufferToBase64(accKey.secretKey)
  const timestamp = new Date().toISOString()
  const identityPublicObject: IdentityKeyPublicObject = {
    key: identityPublicKeyString,
    timestamp: timestamp,
    type: "IdentityKeyPublic",
    version: 1,
  }
  const identityPrivateObject: IdentityKeyPrivateObject = {
    key: identityPrivateKeyString,
    timestamp: timestamp,
    type: "IdentityKeyPrivate",
    version: 1,
  }
  const accountPublicObject: AccountKeyPublicObject = {
    key: accountPublicKeyString,
    type: "AccountKeyPublic",
    version: 1,
  }
  const accountPrivateObject: AccountKeyPrivateObject = {
    key: accountPrivateKeyString,
    type: "AccountKeyPrivate",
    version: 1,
  }
  return {
    identityKey: { public: identityPublicObject, private: identityPrivateObject },
    accountKey: { public: accountPublicObject, private: accountPrivateObject },
  }
}

export async function generateIdentityKeyAndAccountKey(MasterKey: {
  public: string
  private: string
}): Promise<
  {
    identityKey: { public: string; private: string; sign: string }
    accountKey: { public: string; private: string; sign: string }
  }
> {
  const MasterKeyPrivate: MasterKeyPrivateObject = JSON.parse(MasterKey.private)
  const MasterKeyPublic: MasterKeyPublicObject = JSON.parse(MasterKey.public)
  const key = generateIdentityKeyAndAccountKeyObject()
  const IdentityKeyPublic = JSON.stringify(key.identityKey.public)
  const IdentityKeyPrivate = JSON.stringify(key.identityKey.private)
  const AccountKeyPublic = JSON.stringify(key.accountKey.public)
  const AccountKeyPrivate = JSON.stringify(key.accountKey.private)
  const IdentityKeySign = await sign({
    public: MasterKeyPublic.key,
    private: MasterKeyPrivate.key,
  }, IdentityKeyPublic)

  const AccountKeySign = await sign({
    public: key.identityKey.public.key,
    private: key.identityKey.private.key,
  }, AccountKeyPublic)

  return {
    identityKey: {
      public: IdentityKeyPublic,
      private: IdentityKeyPrivate,
      sign: JSON.stringify(IdentityKeySign),
    },
    accountKey: {
      public: AccountKeyPublic,
      private: AccountKeyPrivate,
      sign: JSON.stringify(AccountKeySign),
    },
  }
}
