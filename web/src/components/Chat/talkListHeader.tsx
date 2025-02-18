import { pageState } from "../../utils/state";
import { useAtom } from "solid-jotai";
import { shoowGroupPopUp } from "../../components/CreateGroup";
export default function talkListHeader() {
  const [page] = useAtom(pageState);
  return (
    <>
      {page() == "talk" && (
        <>
          <One />
        </>
      )}
      {page() == "friend" && (
        <>
          {console.log(page())}
          <Two />
        </>
      )}
      {page() == "setting" && (
        <>
          <Three />
        </>
      )}
      {page() == "notification" && (
        <>
          <Notification />
        </>
      )}
    </>
  );
}
function OneTitle() {
  const [_showGroupPopUp, setShowGroupPopUp] = useAtom(shoowGroupPopUp);
  return (
    <div class="flex">
      <h1 class="p-talk-list-title">トーク</h1>
      <button
        onClick={() => {
          setShowGroupPopUp(true);
        }}
      >
        group追加ボタン
      </button>
    </div>
  );
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
  );
}
function TwoTitle() {
  return (
    <>
      <h1 class="p-talk-list-title">トークを追加</h1>
    </>
  );
}
function TwoValue() {
  return (
    <>
    </>
  );
}
function ThreeTitle() {
  return <h1 class="p-talk-list-title">設定</h1>;
}

function Notification() {
  return <h1 class="p-talk-list-title">通知</h1>;
}

function One() {
  return (
    <>
      <OneTitle />
      <OneValue />
    </>
  );
}
function Two() {
  return (
    <>
      <TwoTitle />
      <TwoValue />
    </>
  );
}
function Three() {
  return (
    <>
      <ThreeTitle />
    </>
  );
}
