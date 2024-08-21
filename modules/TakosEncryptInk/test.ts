import {
  createDeviceKey,
  createMasterKey,
  encryptDataDeviceKey,
  decryptDataDeviceKey,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from "./main.ts"

const master = await createMasterKey();
const deviceKey = await createDeviceKey(master);
const startTime = performance.now();
const image = await Deno.readFile("./test.msi");
const base64 = arrayBufferToBase64(image);
const encryptedData = await encryptDataDeviceKey(deviceKey, base64);
console.log(encryptedData.encryptedData.length);
const decryptedData = await decryptDataDeviceKey(deviceKey, encryptedData);
if(decryptedData) {
    const image = base64ToArrayBuffer(decryptedData);
    await Deno.writeFile("./test.msi", new Uint8Array(image));
    const endTime = performance.now();
    //秒に変換
    const time = (endTime - startTime) / 1000;
    console.log(time + "秒");
}

