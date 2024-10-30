import {
  PopUpFrame,
  PopUpInput,
  PopUpLabel,
  PopUpTitle,
} from "../components/popUpFrame";
import { createSignal } from "solid-js";
import { requester } from "../utils/requester";
import uuidv7 from "ui7"
import { generate, encrypt } from "@takos/takos-encrypt-ink";
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
                console.log(userName(), password());
                const uuid = uuidv7();
                const res = await requester(domain, "login", {
                  userName: userName(),
                  password: password(),
                  deviceKey: "",
                  sessionUUID: uuid,
                });
                if (res.status === 200) {
                  const response = await res.json();
                  localStorage.setItem("sessionid", response.sessionid);
                  localStorage.setItem("userName", userName());
                  localStorage.setItem("server", domain);
                  localStorage.setItem("sessionUUID", response.sessionUUID);
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
