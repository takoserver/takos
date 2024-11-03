import { ml_kem768 } from "@noble/post-quantum/ml-kem";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa";

const key = ml_kem768.keygen();

//容量をconsole.logで表示
console.log(key.publicKey.length);
console.log(key.secretKey.length);

const seed = crypto.getRandomValues(new Uint8Array(32));
const key2 = ml_dsa65.keygen(seed);

//容量をconsole.logで表示
console.log(key2.publicKey.length);
console.log(key2.secretKey.length);

const data1 = new TextEncoder().encode("Hello, World!");
const data2 = new TextEncoder().encode("Hello, World2!");

const sign1 = ml_dsa65.sign(key2.secretKey, data1);
const sign2 = ml_dsa65.sign(key2.secretKey, data2);

const hash = new Uint8Array(
  await crypto.subtle.digest("SHA-256", key2.publicKey),
);

console.log(hash.length);

console.log(sign1.length);
console.log(sign2.length);

//kem pub 1184, sec 2400
//dsa pub 1952, sec 4032
//sign 3309
