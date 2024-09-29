import { AppStateType } from "../util/types.ts"
import { useEffect } from "preact/hooks"
import postscribe from "postscribe"
export default function talkListHeader({ state }: { state: AppStateType }) {
  return (
    <>
      {state.page.value == 1 && (
        <>
          <One />
        </>
      )}
      {state.page.value == 2 && (
        <>
          <Two />
        </>
      )}
      {state.page.value == 3 && (
        <>
          <Three />
        </>
      )}
      {state.page.value == 4 && (
        <>
          <Four />
        </>
      )}
    </>
  )
}
function OneTitle() {
  return <h1 class="p-talk-list-title">トーク</h1>
}
function OneValue() {
  return (
    <>
      <div class="p-talk-list-search">
        <form name="talk-search">
          <label>
            <input
              type="text"
              placeholder="検索"
            />
          </label>
        </form>
      </div>
    </>
  )
}
function TwoTitle() {
  return (
    <>
      <h1 class="p-talk-list-title">トークを追加</h1>
    </>
  )
}
function TwoValue() {
  return (
    <>
    </>
  )
}
function ThreeTitle() {
  return <h1 class="p-talk-list-title">設定</h1>
}
function FourTitle() {
  return <h1 class="p-talk-list-title">連絡先の鍵</h1>
}

function One() {
  return (
    <>
      <OneTitle />
      <Ads />
      <OneValue />
    </>
  )
}
function Two() {
  return (
    <>
      <TwoTitle />
      <Ads />
      <TwoValue />
    </>
  )
}
function Three() {
  return (
    <>
      <ThreeTitle />
      <Ads />
    </>
  )
}
function Four() {
  return (
    <>
      <FourTitle />
      <Ads />
    </>
  )
}
const Ads = () => {
  return <></>
  // deno-lint-ignore no-unreachable
  useEffect(() => {
    if (typeof window !== "undefined") {
      import("postscribe").then((postscribe) => {
        postscribe.default(
          "#test",
          '<script src="https://adm.shinobi.jp/o/85c4a26293ac3c80065dc26763dce643"></script>'
        );
      });
    }
  }, []);
// 468:60 = 300:x => x = 300*60/468 = 38.46
  // deno-lint-ignore no-unreachable
  return (
    <div
      id="test"
      class="w-full max-w-xs max-h-48 overflow-hidden"
      style={{ maxWidth: "350px", maxHeight: "290px", objectFit: "contain" }}
    ></div>
  );
};