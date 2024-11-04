import { useAtom } from "solid-jotai";
import { domainState, pageState } from "../../utils/state";
import { Home } from "./home";
import { createTakosDB } from "../../utils/idb";
import { requester } from "../../utils/requester";
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
  const [domain] = useAtom(domainState);
  return (
    <>
      <button
        onClick={async () => {
          localStorage.clear();
          const db = await createTakosDB();
          await db.clear("allowKeys");
          await db.clear("identityAndAccountKeys");
          await db.clear("keyShareKeys");
        }}
      >
        ログアウト
      </button>

      <div>
        <button
          onClick={async () => {
            const server = domain();
            if (!server) return;
            const keyShareKeyRes = await requester(
              server,
              "getKeyShareKeys",
              {
                sessionid: localStorage.getItem("sessionid"),
              },
            )
          }}
        >
          鍵更新ボタン
        </button>
      </div>
    </>
  );
}
