import { useAtom } from "solid-jotai";
import { pageState } from "../../utils/state";
import { Home } from "./home";
import { createTakosDB } from "../../utils/idb";
export function SideBer() {
  const [page] = useAtom(pageState);
  return (
    <>
      {page() === "home" && <Home />}
      {page() === "setting" && <Setting />}
    </>
  );
}

function Setting() {
  return (
    <div
      onClick={async () => {
        localStorage.clear();
        const db = await createTakosDB();
        await db.clear("allowKeys");
        await db.clear("identityAndAccountKeys");
        await db.clear("keyShareKeys");
      }}
    >
      ログアウト
    </div>
  );
}
