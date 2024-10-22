import { loadState, loginState } from "./utils/state.ts";
import { useAtom } from "solid-jotai";
import { Loading } from "./components/Load";
import { Css } from "./components/Css.tsx";
import "./App.css";
import { ChangeURL } from "./components/ChangeURL.tsx";
function App() {
  const [load] = useAtom(loadState);
  const [login] = useAtom(loginState);
  return (
    <>
      {!load() && <Loading />}
      <Css />
      <ChangeURL></ChangeURL>
      {load() && login() && <div>ログイン済み</div>}
      {load() && !login() && <div>未ログイン</div>}
    </>
  );
}

export default App;