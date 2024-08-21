import {
  createIdentityKeyAndAccountKey,
  createMasterKey,
  isValidIdentityKey,
    isValidAccountKey,
} from "./main.ts"

const master = await createMasterKey();
const keys = await createIdentityKeyAndAccountKey(master);
const identityKey = keys.identityKey;
const accountKey = keys.accountKey;

console.log(await isValidIdentityKey(master.public, identityKey.public));
console.log(await isValidAccountKey(identityKey.public, accountKey.public));