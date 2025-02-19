import { loadState, loginState, pageState } from "./utils/state.ts";
import { useAtom } from "solid-jotai";
import { Load, Loading } from "./components/load.tsx";
import { Css } from "./components/Css.tsx";
import "./App.css";
import { ChangeURL } from "./components/ChangeURL.tsx";
import { Register } from "./register/index.tsx";
import { Chat } from "./components/Chat.tsx";
import { createEffect } from "solid-js";
import { CreateIdentityKeyPopUp } from "./components/CreateIdentityKeyPopUp.tsx";
import { CreateGroupPopUp } from "./components/CreateGroup.tsx";
import { SettingRoom } from "./components/SettingRoom.tsx";
import { MigrateKey } from "./components/MigrateKeys.tsx";

function App(
  { page }: { page?: "home" | "talk" | "friend" | "setting" | "notification" },
) {
  const [load] = useAtom(loadState);
  const [login] = useAtom(loginState);
  const [_page, setPageState] = useAtom(pageState);

  setPageState(page || "talk");
  createEffect(() => {
    console.log(load(), login());
  });
  return (
    <>
      {!load() && <Loading />}
      <CreateIdentityKeyPopUp />
      <SettingRoom />
      <CreateGroupPopUp />
      <Css />
      <ChangeURL />
      <Load />
      <MigrateKey />
      {load() && login() && <Chat />}
      {load() && !login() && <Register />}
    </>
  );
}

export default App;
