export default function HeaderButton(props: any) {
  return (
    <li
      class="l-header__ul-item"
      onClick={() => {
        props.setPage(props.page)
        const url = window.location.href
        const path = url.split("/")[3]
        const roomid = url.split("/")[4]
        if (roomid == undefined) {
          history.pushState("", "", "/home/")
          return
        }
        console.log(roomid)
        history.pushState("", "", "/home/" + roomid)
      }}
    >
      <a>
        <svg
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          viewBox="0 0 24 24"
          aria-labelledby="homeAltIconTitle"
          stroke="#ffffff"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        >
          <title id="homeAltIconTitle">Home</title> <path d="M3 10.182V22h18V10.182L12 2z" /> <rect width="6" height="8" x="9" y="14" />
        </svg>
      </a>
    </li>
  )
}
