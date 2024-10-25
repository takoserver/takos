import { loadState, loginState, pageState } from "./utils/state.ts";
import { useAtom } from "solid-jotai";
import { Load, Loading } from "./components/load.tsx";
import { Css } from "./components/Css.tsx";
import "./App.css";
import { ChangeURL } from "./components/ChangeURL.tsx";
import { Register } from "./register/index.tsx";
import { Chat } from "./components/Chat.tsx";
function App({ page }: { page?: "home" | "talk" | "friend" | "setting" }) {
  const [load] = useAtom(loadState);
  const [login] = useAtom(loginState);
  const [_page, setPageState] = useAtom(pageState);
  setPageState(page || "talk");
  return (
    <>
      {!load() && <Loading />}
      <Css />
      <ChangeURL></ChangeURL>
      <Load></Load>
      {load() && login() && <Chat />}
      {load() && !login() && <Register />}
    </>
  );
}

export default App;
