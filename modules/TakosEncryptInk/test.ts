import { exportfromJWK } from "./import.ts"
import { generateAccountKey, generateIdentityKey, generateMasterKey, importKey } from "./mod.ts"
import { signKey, signKeyExpiration, verifyKey, verifyKeyExpiration } from "./SignKey.ts"

/*
確認したいこと
- 各種鍵の生成
- 各種鍵のimport
- masterKeyでidentityKeyを署名
- identityKeyでaccountKeyを署名
- masterKeyでidentityKeyを検証
- identityKeyでaccountKeyを検証
- roomKeyをaccountKeyで暗号化して、identityKeyで復号
- roomKeyでメッセージを暗号化して、roomKeyで復号
*/
//masterKeyを生成
const masterKeyPair = await generateMasterKey()
const masterKeyPub = masterKeyPair.publicKey
const masterKeyPriv = masterKeyPair.privateKey



//identityKeyを生成
const identityKeyPair = await generateIdentityKey(masterKeyPub, masterKeyPriv)
const identityKeyPub = identityKeyPair.public
const identityKeyPriv = identityKeyPair.private
console.log("")
const sign =  await signKey(masterKeyPriv,identityKeyPub.key , "master")
console.log("")
const verify = await verifyKey(identityKeyPub.key, sign)
console.log(verify)

/*

//identityKeyをimport
const identityKeyPubKey = await importKey(identityKeyPub, "public")
const identityKeyPrivKey = await importKey(identityKeyPriv, "private")

//accountKeyを生成
const accountKeyPair = await generateAccountKey(identityKeyPubKey, identityKeyPrivKey)
const accountKeyPub = accountKeyPair.public
const accountKeyPriv = accountKeyPair.private

//accountKeyをimport
const accountKeyPubKey = await importKey(accountKeyPub, "public")
const accountKeyPrivKey = await importKey(accountKeyPriv, "private")

//identityKeyでaccountKeyを署名を検証
const isVerifyAccountKey = await verifyKey(identityKeyPub.key, accountKeyPub.sign)
console.log(isVerifyAccountKey)
*/