import { useAtom } from "solid-jotai";
import { pageState } from "../../utils/state";
import { Home } from "./home";
export function SideBer() {
  const [page] = useAtom(pageState);
  return (
    <>
      {page() === "home" && <Home />}
    </>
  );
}
