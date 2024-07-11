import { AppStateType } from "../util/types.ts";
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
    </>
  );
}
function One() {
  return (
    <>
      <h1 class="p-talk-list-title">トーク</h1>
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
function Two() {
  return (
    <>
      <h1 class="p-talk-list-title">友達を追加</h1>
    </>
  );
}
function Three() {
  return <h1 class="p-talk-list-title">設定</h1>;
}
