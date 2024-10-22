import { createEffect } from "solid-js";
import { loginState, pageState } from "../utils/state";
import { useAtom } from "solid-jotai";
export function ChangeURL() {
  const [login] = useAtom(loginState);
  const [page] = useAtom(pageState);

  createEffect(() => {
    const url = window.location.pathname;
    if (login()) {
      if (page() === "home" && url !== "/home") {
        window.history.pushState(null, "", "/home");
      } else if (page() === "talk" && url !== "/talk" && page() === "/") {
        window.history.pushState(null, "", "/talk");
      } else if (page() === "friend" && url !== "/friend") {
        window.history.pushState(null, "", "/friend");
      } else if (page() === "setting" && url !== "/setting") {
        window.history.pushState(null, "", "/setting");
      }
    } else if (url !== "/") {
      console.log("login");
      window.history.pushState(null, "", "/");
    }
  });
  return <></>;
}
