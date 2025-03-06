import { generateMasterKey, signMasterKey, verifyMasterKey } from "./mod.ts";
import { keyHash } from "./utils/keyHash.ts";

const data = "Hello, World!";

const masteKey = generateMasterKey();

const signature = signMasterKey(
  masteKey.privateKey,
  data,
  await keyHash(masteKey.publicKey),
);
if (!signature) throw new Error("Failed to sign");
console.log(verifyMasterKey(masteKey.publicKey, signature, data));

/*
import { ml_dsa65, ml_dsa87 } from "@noble/post-quantum/ml-dsa";

const data = "Hello, World!"

const seed = crypto.getRandomValues(new Uint8Array(32))

const keyPair = ml_dsa65.keygen(seed)
const signature = ml_dsa65.sign(keyPair.secretKey, new TextEncoder().encode(data))
console.log(ml_dsa65.verify(keyPair.publicKey, new TextEncoder().encode(data), signature))

*/
