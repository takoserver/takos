import { atom, useAtom } from "solid-jotai";
import { PopUpFrame } from "./Chat/setupPopup/popUpFrame";
import { createEffect, createSignal } from "solid-js";
import { createTakosDB } from "../utils/idb";
import { deviceKeyState } from "../utils/state";
import {
  decryptDataDeviceKey,
  encryptDataDeviceKey,
  generateIdentityKey,
  keyHash,
} from "@takos/takos-encrypt-ink";

export const shoowIdentityKeyPopUp = atom(false);

export function CreateIdentityKeyPopUp() {
  const [showIdentityKeyPopUp, setShowIdentityKeyPopUp] = useAtom(
    shoowIdentityKeyPopUp,
  );
  const [lastCreateIdentityKeyTime, setLastCreateIdentityKeyTime] =
    createSignal("");
  const [deviceKey] = useAtom(deviceKeyState);

  createEffect(async () => {
    const db = await createTakosDB();
    const identityKey = await db.getAll("identityKeys");
    const latestIdentityKey = identityKey.sort((a, b) =>
      b.timestamp - a.timestamp
    )[0];
    if (latestIdentityKey) {
      setLastCreateIdentityKeyTime(
        new Date(latestIdentityKey.timestamp).toLocaleString(),
      );
      return;
    }
    setLastCreateIdentityKeyTime("未作成");
  });

  async function handleCreateIdentityKey() {
    const db = await createTakosDB();
    const encryptedMasterKey = localStorage.getItem("masterKey");
    const sessionUUID = localStorage.getItem("sessionUUID");
    if (!encryptedMasterKey || !sessionUUID) return;
    const deviceKeyVal = deviceKey();
    if (!deviceKeyVal) return;
    const masterKey = await decryptDataDeviceKey(
      deviceKeyVal,
      encryptedMasterKey,
    );
    if (!masterKey) return;
    const identityKey = await generateIdentityKey(
      sessionUUID,
      JSON.parse(masterKey),
    );
    if (!identityKey) return;
    const res = await fetch("./api/v2/keys/identityKey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        identityKey: identityKey.publickKey,
        identityKeySign: identityKey.sign,
      }),
    });
    if (res.status !== 200) return;
    const encryptedIdentityKey = await encryptDataDeviceKey(
      deviceKeyVal,
      identityKey.privateKey,
    );
    if (!encryptedIdentityKey) return;
    await db.put("identityKeys", {
      key: await keyHash(identityKey.publickKey),
      encryptedKey: encryptedIdentityKey,
      timestamp: Date.now(),
    });
    setShowIdentityKeyPopUp(false);
    alert("IdentityKeyを作成しました。");
  }

  return (
    <>
      {showIdentityKeyPopUp() && (
        <div class="fixed z-50 w-full h-full bg-[rgba(28,34,40,0.15)] left-0 top-0 flex justify-center items-center p-3 md:pb-3 pb-[76px]">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl dark:shadow-2xl w-full max-w-md">
            <div class="flex justify-between items-center border-b px-4 py-2 border-gray-200 dark:border-gray-700">
              <h2 class="text-xl font-bold text-gray-800 dark:text-white">
                IdentityKey作成
              </h2>
              <button
                onClick={() => setShowIdentityKeyPopUp(false)}
                class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-2xl font-bold"
              >
                &times;
              </button>
            </div>
            <div class="p-6">
              <p class="text-gray-700 dark:text-gray-300 mb-2">
                最新のidentityKeyの作成時期:
              </p>
              <div class="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded text-gray-800 dark:text-gray-100 font-medium">
                {lastCreateIdentityKeyTime()}
              </div>
              <div class="flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateIdentityKey}
                  class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded shadow-md hover:shadow-lg transition-shadow"
                >
                  作成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
