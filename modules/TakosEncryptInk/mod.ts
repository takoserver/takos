import generateAccountKey from "./generate/AccountKey.ts";
import generRoomKey from "./generate/RoomKey.ts";
import generateDeviceKey from "./generate/DeviceKey.ts";

export default {
  accountKey: {
    generate: generateAccountKey,
  },
  roomKey: {
    generate: generRoomKey,
  },
  deviceKey: {
    generate: generateDeviceKey,
  },
};

const key = await generateDeviceKey();
console.log(key);
