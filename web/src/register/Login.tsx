import {
  PopUpFrame,
  PopUpInput,
  PopUpLabel,
  PopUpTitle,
} from "../components/popUpFrame";
import { createSignal } from "solid-js";
import { requester } from "../utils/requester";
import { uuidv7 } from "uuidv7";
import { generateDeviceKey } from "@takos/takos-encrypt-ink";
import { clearDB, createTakosDB, localStorageEditor } from "../utils/idb";

export function Login({ domain }: { domain: string }) {
  const [open, setOpen] = createSignal(false);
  const [userName, setUserName] = createSignal("");
  const [password, setPassword] = createSignal("");
  return (
    <>
      <button
        class="bg-[#192320] text-white rounded-3xl py-2 px-4 hover:bg-[#192320] border w-full lg:mt-2 mt-3"
        onClick={() => {
          setOpen(true);
        }}
      >
        ログイン
      </button>
      {open() && (
        <PopUpFrame
          closeScript={setOpen}
        >
          <PopUpTitle>ログイン</PopUpTitle>
          <PopUpLabel htmlFor="text">userName</PopUpLabel>
          <PopUpInput
            type="text"
            state={setUserName}
            placeholder="userName"
          />
          <PopUpLabel htmlFor="password">password</PopUpLabel>
          <PopUpInput
            type="password"
            state={setPassword}
            placeholder="password"
          />
          <div>
            <button
              class="bg-[#192320] text-white rounded-3xl py-2 px-4 hover:bg-[#192320] border w-full lg:mt-2 mt-3"
              onClick={async () => {
                const res = await requester(domain, "login", {
                  userName: userName(),
                  password: password(),
                });
                if (res.status === 200) {
                  const response = await res.json();
                  localStorageEditor.set("sessionid", response.sessionid);
                  localStorageEditor.set("userName", userName());
                  localStorageEditor.set("server", domain);
                  const db = await createTakosDB();
                  clearDB();
                  window.location.reload();
                } else {
                  alert("ログインに失敗しました");
                }
              }}
            >
              ログイン
            </button>
          </div>
        </PopUpFrame>
      )}
    </>
  );
}
