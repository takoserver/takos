import { loadState, loginState } from "./utils/state.ts";
import { useAtom } from "solid-jotai";
import { Load, Loading } from "./components/load.tsx";
import { Css } from "./components/Css.tsx";
import "./App.css";
import { ChangeURL } from "./components/ChangeURL.tsx";
import { Register } from "./register/index.tsx";
function App() {
  const [load] = useAtom(loadState);
  const [login] = useAtom(loginState);
  return (
    <>
      {!load() && <Loading />}
      <Css />
      <ChangeURL></ChangeURL>
      <Load></Load>
      {load() && login() && <div>ログイン済み</div>}
      {load() && !login() && <Register />}
    </>
  );
}

export default App;
