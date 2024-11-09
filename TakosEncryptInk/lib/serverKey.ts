import { ml_dsa65 } from "@noble/post-quantum/ml-dsa";
import { arrayBufferToBase64, base64ToArrayBuffer } from "../utils/buffers.ts"

function generateServerKey(): {
    public: string;
    private: string;
} {
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const key = ml_dsa65.keygen(seed);
    return {
        public: arrayBufferToBase64(key.publicKey),
        private: arrayBufferToBase64(key.secretKey),
    };
}

function signData (data: string, secretKey: string): string {
    const key = base64ToArrayBuffer(secretKey)
    return arrayBufferToBase64(ml_dsa65.sign(new Uint8Array(key),new TextEncoder().encode(data)))
}

function verifyData (data: string, signature: string, publicKey: string): boolean {
    const key = base64ToArrayBuffer(publicKey)
    return ml_dsa65.verify(new Uint8Array(key),new TextEncoder().encode(data), new Uint8Array(base64ToArrayBuffer(signature)))
}

export { generateServerKey, signData, verifyData }