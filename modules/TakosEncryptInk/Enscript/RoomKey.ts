import { ArrayBuffertoBase64, base64ToArrayBuffer } from "../base.ts";

// テキストデータの暗号化
async function encryptRoomKeyTextData(data: string, CommonKey: CryptoKey): Promise<{ encryptedData: string, iv: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);
    const encryptedData = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        CommonKey,
        encodedData,
    );
    return {
        encryptedData: ArrayBuffertoBase64(encryptedData),
        iv: ArrayBuffertoBase64(iv),
    };
}

// テキストデータの複合化
async function decryptRoomKeyTextData(encryptedData: string, CommonKey: CryptoKey, iv: string): Promise<string> {
    const encryptedArrayBuffer = base64ToArrayBuffer(encryptedData);
    const ivArrayBuffer = base64ToArrayBuffer(iv);
    const decryptedData = await window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: new Uint8Array(ivArrayBuffer),
        },
        CommonKey,
        new Uint8Array(encryptedArrayBuffer),
    );
    return new TextDecoder().decode(decryptedData);
}

export { decryptRoomKeyTextData, encryptRoomKeyTextData };
