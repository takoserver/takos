async function enscriptRoomKeyTextData(data: string, CommonKey: CryptoKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encodedData = new TextEncoder().encode(data)
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    CommonKey,
    encodedData,
  )
  return {
    encryptedData: new Uint8Array(encryptedData),
    iv: iv,
  }
}
async function decriptRoomKeyTextData(
  data: ArrayBuffer,
  CommonKey: CryptoKey,
  iv: Uint8Array,
) {
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    CommonKey,
    data,
  )
  return new TextDecoder().decode(decryptedData)
}

async function enscriptRoomKeyData(data: ArrayBuffer, CommonKey: CryptoKey) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    CommonKey,
    data,
  )
  return {
    encryptedData: encryptedData,
    iv: iv,
  }
}
async function decriptRoomKeyData(
  data: ArrayBuffer,
  CommonKey: CryptoKey,
  iv: Uint8Array,
) {
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    CommonKey,
    data,
  )
  return decryptedData
}
export { decriptRoomKeyData, decriptRoomKeyTextData, enscriptRoomKeyData, enscriptRoomKeyTextData }
