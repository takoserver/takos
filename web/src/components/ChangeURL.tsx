import { createEffect } from "solid-js";
import { loadState, loginState, pageState } from "../utils/state";
import { useAtom } from "solid-jotai";
export function ChangeURL() {
  const [login] = useAtom(loginState);
  const [page] = useAtom(pageState);
  const [load] = useAtom(loadState);
  createEffect(() => {
    if(!load()) return;
    const url = window.location.pathname;
    if (login()) {
      if (page() === "home" && url !== "/home") {
        window.history.pushState(null, "", "/home");
      } else if (page() === "talk" && url !== "/talk" || url === "/") {
        window.history.pushState(null, "", "/talk");
      } else if (page() === "friend" && url !== "/friend") {
        window.history.pushState(null, "", "/friend");
      } else if (page() === "setting" && url !== "/setting") {
        window.history.pushState(null, "", "/setting");
      } else if (page() === "notification" && url !== "/notification") {
        window.history.pushState(null, "", "/notification");
      }
    } else if (url !== "/") {
      window.history.pushState(null, "", "/");
    }
  });
  return <></>;
}
