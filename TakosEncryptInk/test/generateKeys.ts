import { arrayBufferToBase64, base64ToArrayBuffer } from "../_main.ts"
import {
    createMasterKey,
    createIdentityKeyAndAccountKey,
    createRoomKey,
} from "../lib/generates.ts"

const bobMasterKey = await createMasterKey()
const aliceMasterKey = await createMasterKey()

const bobKeys = await createIdentityKeyAndAccountKey(bobMasterKey)

const BobIdentityKey = bobKeys.IdentityKey[0]
const BobIdentitySign = bobKeys.IdentityKey[1]

const BobAccountKey = bobKeys.AccountKey[0]
const BobAccountSign = bobKeys.AccountKey[1]

const aliceKeys = await createIdentityKeyAndAccountKey(aliceMasterKey)

const AliceIdentityKey = aliceKeys.IdentityKey[0]
const AliceIdentitySign = aliceKeys.IdentityKey[1]

const AliceAccountKey = aliceKeys.AccountKey[0]
const AliceAccountSign = aliceKeys.AccountKey[1]

const bobMasterhash = arrayBufferToBase64(await crypto.subtle.digest("SHA-256", base64ToArrayBuffer(bobMasterKey.public.key)))
const aliceMasterhash = arrayBufferToBase64(await crypto.subtle.digest("SHA-256", base64ToArrayBuffer(aliceMasterKey.public.key)))

const roomKey = await createRoomKey([[aliceMasterKey.public, { key: AliceIdentityKey.public, sign: AliceIdentitySign }, { key: AliceAccountKey.public, sign: AliceAccountSign}, "alice"],[bobMasterKey.public, { key: BobIdentityKey.public, sign: BobIdentitySign }, { key: BobAccountKey.public, sign: BobAccountSign}, "bob"]], BobIdentityKey, [
    { userid: "alice", key: "aliceMasterhash" },
    { userid: "bob", key: "bobMasterhash" }
])
console.log(roomKey)