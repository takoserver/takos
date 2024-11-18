import { uuidv7 } from "uuidv7"
import { decryptDataAccountKey,isValidEncryptedRoomKey, decryptDataMigrateKey, decryptDataShareKey, decryptMessage, encryptDataAccountKey, encryptDataMigrateKey, encryptDataShareKey, encryptMessage, encryptRoomKeyWithAccountKeys, generateAccountKey, generateIdentityKey, generateMasterKey, generateMigrateKey, generateMigrateSignKey, generateRoomkey, generateShareKey, generateShareSignKey, isValidAccountKeyPrivate, isValidAccountKeyPublic, isValidEncryptedDataAccountKey, isValidEncryptedDataMigrateKey, isValidIdentityKeyPrivate, isValidIdentityKeyPublic, isValidMasterKeyPrivate, isValidMasterKeyPublic, isValidMigrateKeyPrivate, isValidMigrateKeyPublic, isValidMigrateSignKeyPrivate, isValidMigrateSignKeyPublic, isValidRoomKey, isValidShareKeyPrivate, isValidShareKeyPublic, isValidShareSignKeyPrivate, isValidShareSignKeyPublic, isValidSignIdentityKey, isValidSignMigrateSignKey, isValidSignShareSignKey, signDataMigrateSignKey, signDataShareSignKey, signIdentityKey, verifyDataMigrateSignKey, verifyDataShareSignKey, verifyIdentityKey, verifyMasterKey } from "./mod.ts"

function testMasterKey() {
    console.log("Testing Master Key...");
    const masterKey = generateMasterKey();
    console.log("Valid Private:", isValidMasterKeyPrivate(masterKey.privateKey));
    console.log("Valid Public:", isValidMasterKeyPublic(masterKey.publicKey));
  }
  
  async function testIdentityKey() {
    console.log("\nTesting Identity Key...");
    const masterKey = generateMasterKey();
    const identityKey = await generateIdentityKey(uuidv7(), masterKey.privateKey);
    if (!identityKey) return;
    
    console.log("Master Key Verification:", verifyMasterKey(masterKey.publicKey, identityKey.sign, identityKey.publickKey));
    console.log("Valid Private:", isValidIdentityKeyPrivate(identityKey.privateKey));
    console.log("Valid Public:", isValidIdentityKeyPublic(identityKey.publickKey));
  
    const secretText = "Hello World";
    const sign = await signIdentityKey(identityKey.privateKey, secretText);
    if (!sign) return;
    console.log("Signature Verification:", verifyIdentityKey(identityKey.publickKey, sign, secretText));
    console.log("Valid Sign:", isValidSignIdentityKey(sign));
  }
  
  async function testAccountKey() {
    console.log("\nTesting Account Key...");
    const masterKey = generateMasterKey();
    const accountKey = await generateAccountKey(masterKey.privateKey);
    if (!accountKey) return;
  
    console.log("Valid Private:", isValidAccountKeyPrivate(accountKey.privateKey));
    console.log("Valid Public:", isValidAccountKeyPublic(accountKey.publickKey));
  
    const secretText = "Hello World";
    const encryptedData = await encryptDataAccountKey(accountKey.publickKey, secretText);
    if (!encryptedData) return;
    console.log("Valid Encrypted Data:", isValidEncryptedDataAccountKey(encryptedData));
  
    const decryptedData = await decryptDataAccountKey(accountKey.privateKey, encryptedData);
    console.log("Decryption Success:", decryptedData === secretText);
  }
  
  async function testRoomKey() {
    console.log("\nTesting Room Key...");
    const roomKey = await generateRoomkey(uuidv7());
    if (!roomKey) return;
    console.log("Valid Room Key:", isValidRoomKey(roomKey));
  
    const accountKey = await generateAccountKey(generateMasterKey().privateKey);
    if (!accountKey) return;
  
    const encryptedRoomKey = await encryptDataAccountKey(accountKey.publickKey, roomKey);
    if (!encryptedRoomKey) return;
    console.log("Valid Encrypted Room Key:", isValidEncryptedRoomKey(encryptedRoomKey));
  
    const decryptedRoomKey = await decryptDataAccountKey(accountKey.privateKey, encryptedRoomKey);
    console.log("Decryption Success:", decryptedRoomKey === roomKey);
  }
  
  async function testShareKey() {
    console.log("\nTesting Share Key...");
    const masterKey = generateMasterKey();
    const shareKey = await generateShareKey(masterKey.privateKey, uuidv7());
    if (!shareKey) return;
  
    console.log("Valid Private:", isValidShareKeyPrivate(shareKey.privateKey));
    console.log("Valid Public:", isValidShareKeyPublic(shareKey.publickKey));
  
    const secretText = "Hello World";
    const encryptedData = await encryptDataShareKey(shareKey.publickKey, secretText);
    if (!encryptedData) return;
    const decryptedData = await decryptDataShareKey(shareKey.privateKey, encryptedData);
    console.log("Encryption/Decryption Success:", decryptedData === secretText);
  }
  
  async function testMigrateKey() {
    console.log("\nTesting Migrate Key...");
    const migrateKey = generateMigrateKey();
    console.log("Valid Private:", isValidMigrateKeyPrivate(migrateKey.privateKey));
    console.log("Valid Public:", isValidMigrateKeyPublic(migrateKey.publickKey));
  
    const secretText = "Hello World";
    const encryptedData = await encryptDataMigrateKey(migrateKey.publickKey, secretText);
    if (!encryptedData) return;
    console.log("Valid Encrypted Data:", isValidEncryptedDataMigrateKey(encryptedData));
  
    const decryptedData = await decryptDataMigrateKey(migrateKey.privateKey, encryptedData);
    console.log("Decryption Success:", decryptedData === secretText);
  }
  
  async function testSignKeys() {
    console.log("\nTesting Sign Keys...");
    const masterKey = generateMasterKey();
    const secretText = "Hello World";
  
    // Share Sign Key
    const shareSignKey = await generateShareSignKey(masterKey.privateKey, uuidv7());
    if (!shareSignKey) return;
    console.log("Valid Share Sign Private:", isValidShareSignKeyPrivate(shareSignKey.privateKey));
    console.log("Valid Share Sign Public:", isValidShareSignKeyPublic(shareSignKey.publickKey));
  
    const signShareKey = await signDataShareSignKey(shareSignKey.privateKey, secretText);
    if (!signShareKey) return;
    console.log("Share Sign Verification:", verifyDataShareSignKey(shareSignKey.publickKey, signShareKey, secretText));
    console.log("Valid Share Sign:", isValidSignShareSignKey(signShareKey));
  
    // Migrate Sign Key
    const migrateSignKey = generateMigrateSignKey();
    console.log("Valid Migrate Sign Private:", isValidMigrateSignKeyPrivate(migrateSignKey.privateKey));
    console.log("Valid Migrate Sign Public:", isValidMigrateSignKeyPublic(migrateSignKey.publickKey));
  
    const signMigrateKey = await signDataMigrateSignKey(migrateSignKey.privateKey, secretText);
    if (!signMigrateKey) return;
    console.log("Migrate Sign Verification:", verifyDataMigrateSignKey(migrateSignKey.publickKey, signMigrateKey, secretText));
    console.log("Valid Migrate Sign:", isValidSignMigrateSignKey(signMigrateKey));
  }
  
  async function testMessage() {
    console.log("\nTesting Message...");
    const createUserData = async () => {
      const uuid = uuidv7();
      const masterKey = generateMasterKey();
      const identityKey = await generateIdentityKey(uuid, masterKey.privateKey);
      const accountKey = await generateAccountKey(masterKey.privateKey);
      if(!identityKey || !accountKey) throw new Error("Failed to create user data");
      return {
        uuid,
        masterKey,
        identityKey,
        accountKey,
      }
    }
    const bob = await createUserData();
    const alice = await createUserData();
    const aliceRoomKey = await generateRoomkey(alice.uuid);
    if (!aliceRoomKey) return;
    const encryptedAliceRoomKey = await encryptRoomKeyWithAccountKeys([{
      masterKey: bob.masterKey.publicKey,
      accountKeySign: bob.accountKey?.sign,
      accountKey: bob.accountKey.publickKey,
      userId: "bob",
    }, {
      masterKey: alice.masterKey.publicKey,
      accountKeySign: alice.accountKey?.sign,
      accountKey: alice.accountKey.publickKey,
      userId: "alice",
    }], aliceRoomKey, alice.identityKey.privateKey);
    if (!encryptedAliceRoomKey) return;
    const encryptedMessage = await encryptMessage({
      type: "text",
      content: "Hello World",
      channel: "general",
      timestamp: new Date().getTime(),
      isLarge: false,
    }, aliceRoomKey, alice.identityKey.privateKey, "roomid");
    if (!encryptedMessage) return;
    const decryptedRoomKey = await decryptDataAccountKey(bob.accountKey.privateKey, encryptedAliceRoomKey.encryptedData[0].encryptedData);
    if (!decryptedRoomKey) return;
    const decryptedMessage = await decryptMessage({
      message: encryptedMessage.message,
      sign: encryptedMessage.sign,
    }, {
      timestamp: new Date().getTime(),
    }, decryptedRoomKey, alice.identityKey.publickKey, "roomid");
    console.log("Decrypted Message:", decryptedMessage);
  }
  
  async function test() {
    await testMasterKey();
    await testIdentityKey();
    await testAccountKey();
    await testRoomKey();
    await testShareKey();
    await testMigrateKey();
    await testSignKeys();
    await testMessage();
    console.log("\nAll tests completed");
  }
  
  test()