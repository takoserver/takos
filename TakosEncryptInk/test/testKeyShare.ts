import { generateKeyShareKeys } from "../lib/generate/keyShareKey.ts"
import { isValidkeyShareSignKeyPrivate } from "../lib/isValid.ts/keyShareKey.ts"
import { signDataKeyShareKey } from "../lib/sign/signDataKeyShareSignKey.ts"
import { generateIdentityKeyAndAccountKey, generateMasterKey, isValidkeyShareSignKeyPublic } from "../mod.ts"
import { uuidv7 } from "uuidv7"

async function createUserKeys() {
    const masterkeys = generateMasterKey();
    const identityAndAccountKeys = await generateIdentityKeyAndAccountKey(
      masterkeys,
    );
    return {
      masterkeys,
      identityAndAccountKeys,
};
}

const bobKeys = await createUserKeys();

const uuid = uuidv7();

const keySharekey = await generateKeyShareKeys(bobKeys.masterkeys, uuid);

console.log(isValidkeyShareSignKeyPublic(keySharekey.keyShareSignKey.public));
console.log(isValidkeyShareSignKeyPrivate(keySharekey.keyShareSignKey.private));