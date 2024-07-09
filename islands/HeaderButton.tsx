export default function HeaderButton(props: { page: any; children: any; state: any }) {
  return (
    <li
      class="l-header__ul-item"
      onClick={() => {
        const url = window.location.href
        const roomid = url.split("/")[4]
        props.state.page.value = props.page
        if (roomid == undefined) {
          history.pushState("", "", urlPramator(props.page))
          return
        }
        history.pushState("", "", urlPramator(props.page) + roomid)
      }}
    >
      {props.children}
    </li>
  )
}
function urlPramator(page: number) {
  let result = ""
  switch (page) {
    case 0:
      result = "/home/"
      break
    case 1:
      result = "/talk/"
      break
    case 2:
      result = "/addFriend/"
      break
    case 3:
      result = "/setting/"
      break
  }
  return result
}
