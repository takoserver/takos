import { createContext, createSignal,createEffect, useContext } from "solid-js";
import "./App.css";
import { AppState, createAppState } from "./utils/type";

const AppStateValue: AppState = createAppState();
export const AppContext = createContext(
  AppStateValue
);

function AppProvide() {
  createEffect(() => {
    setTimeout(() => {
      AppStateValue.load.setter("loaded");
    }, 3000);
  })
  return (
    <>
      <AppContext.Provider value={AppStateValue}>
        <App />
      </AppContext.Provider>
    </>
  );
}

function App() {
  const AppState = useContext(AppContext);
  console.log(AppState);
  return (
    <>
    {AppState.load.accessor() === "loading" && (<>
      <div class="w-full h-screen flex fixed z-[999999999999999999] bg-white">
        <p class="m-auto">loading......</p>
      </div>
    </>)}
      <div class="w-full h-screen flex">
        <p class="m-auto">ようこそ</p>
      </div>
    </>
  )
}

export default AppProvide;
