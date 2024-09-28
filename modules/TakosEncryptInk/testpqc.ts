import { ml_kem1024, ml_kem512, ml_kem768 } from "@noble/post-quantum/ml-kem"
import { ml_dsa44, ml_dsa65, ml_dsa87 } from "@noble/post-quantum/ml-dsa"

{
  const aliceKeys = ml_kem768.keygen()
  const alicePub = aliceKeys.publicKey

  // [Bob] generates shared secret for Alice publicKey
  // bobShared never leaves [Bob] system and is unknown to other parties
  const { cipherText, sharedSecret: bobShared } = ml_kem768.encapsulate(alicePub)

  // Alice gets and decrypts cipherText from Bob
  const aliceShared = ml_kem768.decapsulate(cipherText, aliceKeys.secretKey)

  console.log(bobShared.join("") == aliceShared.join(""))
}

{
  const seed = crypto.getRandomValues(new Uint8Array(32))
  const aliceKeys = ml_dsa65.keygen(seed)
  const msg = new Uint8Array(1)
  const sig = ml_dsa65.sign(aliceKeys.secretKey, msg)
  const isValid = ml_dsa65.verify(aliceKeys.publicKey, msg, sig)
  console.log(isValid)
}