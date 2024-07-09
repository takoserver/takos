export default function talkListHeader({ page }: { page: any }) {
  console.log(page)
  return (
    <>
      {page.value == 1 && (
        <>
          <One />
        </>
      )}
      {page.value == 2 && (
        <>
          <Two />
        </>
      )}
      {page.value == 3 && (
        <>
          <Three />
        </>
      )}
    </>
  )
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
  )
}
function Two() {
  return (
    <>
      <h1 class="p-talk-list-title">友達を追加</h1>
    </>
  )
}
function Three() {
  return <h1 class="p-talk-list-title">設定</h1>
}
