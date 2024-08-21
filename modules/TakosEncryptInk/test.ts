import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  createDeviceKey,
  createIdentityKeyAndAccountKey,
  createMasterKey,
  decryptDataDeviceKey,
  encryptDataDeviceKey,
  IdentityKey,
  isValidIdentityKeyHashChain,
  OtherUserIdentityKeys
} from "./main.ts"
let HashChain: OtherUserIdentityKeys = []
const master = await createMasterKey()
const deviceKey = await createDeviceKey(master)
const keys = await createIdentityKeyAndAccountKey(master)
HashChain.push({
    identityKey: keys.identityKey.public,
    hashHex: keys.identityKey.hashHex,
    hashChain: keys.identityKey.hashChain
})
const keys2 = await createIdentityKeyAndAccountKey(master, keys.identityKey.hashChain.hash)
HashChain.push({
    identityKey: keys2.identityKey.public,
    hashHex: keys2.identityKey.hashHex,
    hashChain: keys2.identityKey.hashChain
})
const keys3 = await createIdentityKeyAndAccountKey(master, keys2.identityKey.hashChain.hash)
HashChain.push({
    identityKey: keys3.identityKey.public,
    hashHex: keys3.identityKey.hashHex,
    hashChain: keys3.identityKey.hashChain
})
const keys4 = await createIdentityKeyAndAccountKey(master, keys3.identityKey.hashChain.hash)
HashChain.push({
    identityKey: keys4.identityKey.public,
    hashHex: keys4.identityKey.hashHex,
    hashChain: keys4.identityKey.hashChain
})
const keys5 = await createIdentityKeyAndAccountKey(master, keys4.identityKey.hashChain.hash)
HashChain.push({
    identityKey: keys5.identityKey.public,
    hashHex: keys5.identityKey.hashHex,
    hashChain: keys5.identityKey.hashChain
})
console.log(await isValidIdentityKeyHashChain(HashChain,master.public, false))