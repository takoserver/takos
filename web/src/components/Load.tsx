import { useAtom } from "solid-jotai";
import {
  defaultServerState,
  exproleServerState,
  loadState,
  loginState,
  setDefaultServerState,
} from "../utils/state";
import setting from "../setting.json";
export function Loading() {
  return (
    <>
      <div class="w-full h-screen fixed z-[99999999999] flex bg-[#181818]">
        <div class="m-auto flex flex-col items-center">
          <div class="loader mb-4"></div>
          <div class="text-4xl text-center text-white">Loading...</div>
        </div>
      </div>
      <style>
        {`
        .loader {
          border: 8px solid rgba(255, 255, 255, 0.1);
          border-top: 8px solid #ffffff;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}
      </style>
    </>
  );
}

export function Load() {
  const [_load, setLoad] = useAtom(loadState);
  const [_login, setLogin] = useAtom(loginState);
  const sessionid = localStorage.getItem("sessionid");
  const serverDomain = localStorage.getItem("serverDomain");
  if (sessionid && serverDomain) {
    // 後で書く
    return <></>;
  }
  setLogin(false);
  setLoad(true);
  console.log("load");
  return <></>;
}
