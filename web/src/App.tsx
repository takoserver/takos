import "./App.css";
import {
  createContext,
  createEffect,
  createSignal,
  useContext,
} from "solid-js";
import { MetaProvider, Link } from "@solidjs/meta";
import { AppState, createAppState } from "./utils/type";
import Register from "./Register";
import Chat from "./Chat";
const AppStateValue: AppState = createAppState();
export const AppContext = createContext(
  AppStateValue,
);

function AppProvide() {
  return (
    <>
      <AppContext.Provider value={AppStateValue}>
      <MetaProvider>
        <App />
       </MetaProvider>
      </AppContext.Provider>
    </>
  );
}

function Init({ appState }: { appState: AppState }) {
  const sessionid = localStorage.getItem("sessionid");
  const serverDomain = localStorage.getItem("serverDomain");
  if (sessionid && serverDomain) {
    // setup websocket and decrypt key
    return <></>;
  }
  appState.load.setter("loaded");

  return <></>;
}
function App() {
  const AppState = useContext(AppContext);
  console.log(AppState);
  console.log(AppState.login.accessor());
  return (
    <>
      {AppState.load.accessor() === "loading" && (
        <>
          <div class="w-full h-screen flex fixed z-[999999999999999999] bg-[#]">
            <p class="m-auto">loading......</p>
          </div>
        </>
      )}
      <Init appState={AppState} />
      {AppState.load.accessor() === "loaded" && (
        <>
          {AppState.login.accessor() === false
            ? (
              <>
                <Register />
                <Link
                  rel="stylesheet"
                  href="/stylesheet.css"
                >
                </Link>
              </>
            )
            : (
              <>
                <Link
                  rel="stylesheet"
                  href="/App.css"
                >
                </Link>
                <Chat></Chat>
              </>
            )}
        </>
      )}
    </>
  );
}

export default AppProvide;
