import { useAtom } from "solid-jotai";
import {
  defaultServerState,
  EncryptedSessionState,
  exproleServerState,
  loadState,
  loginState,
  setDefaultServerState,
  setUpState,
  deviceKeyState,
  domainState,
  sessionidState
} from "../utils/state";
import setting from "../setting.json";
import { requester } from "../utils/requester";
import { localStorageEditor } from "../utils/idb";
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
  const [setUp, setSetUp] = useAtom(setUpState);
  const [deviceKey, setDeviceKey] = useAtom(deviceKeyState);
  const [EncryptedSession, setEncryptedSession] = useAtom(
    EncryptedSessionState,
  );
  const [domain, setDomain] = useAtom(domainState);
  const [sessionId, setSessionid] = useAtom(sessionidState);
  const sessionid = localStorageEditor.get("sessionid");
  const serverDomain = localStorageEditor.get("server");
  setDomain(serverDomain);
  setSessionid(sessionid);
  if (sessionid && serverDomain) {
    async function LoadFetch() {
      if (!serverDomain) {
        setLogin(false);
        return <></>;
      }
      const sessionInfo = await requester(serverDomain, "getSessionInfo", {
        sessionid,
      });
      console.log(sessionInfo,"sessionInfo");
      if (sessionInfo.status === 200) {
        const response = await sessionInfo.json();
        setSetUp(response.setuped);
        setDeviceKey(response.deviceKey);
        setEncryptedSession(response.sessionEncrypted);
        for (const id of response.sharedDataIds) {
          // todo: fetch shared data
        }
        setLogin(true);
        setLoad(true);
        console.log("load");
        return <></>;
      }
      setLogin(false);
      setLoad(true);
    }
    LoadFetch();
    return <></>;
  }
  setLogin(false);
  setLoad(true);
  return <></>;
}