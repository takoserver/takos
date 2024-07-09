export default function User(
  { userName, latestMessage, icon, onClick, userName2, isNewMessage, isSelected }: {
    userName: string
    latestMessage: string
    icon: string
    onClick?: () => void
    userName2?: string
    isNewMessage: boolean
    isSelected: boolean
  },
) {
  let resultLatestMessage
  if (latestMessage.length > 17) {
    resultLatestMessage = latestMessage.substr(0, 17) + "..."
  } else {
    resultLatestMessage = latestMessage
  }

  const className = isSelected ? "c-talk-rooms is-active" : "c-talk-rooms"

  return (
    <>
      <li class={className} onClick={isOnClickUndefind(onClick)}>
        <a>
          <div class="c-talk-rooms-icon">
            <img src={icon} />
          </div>
          <div class="c-talk-rooms-box">
            <p class="c-talk-rooms-name">
              <span class="c-talk-rooms-nickname">{userName}</span>
              <span class="c-talk-rooms-locate">
                {userName2 == undefined ? ("") : userName2}
              </span>
            </p>
            <div class="c-talk-rooms-msg">
              <p>{resultLatestMessage}</p>
            </div>
          </div>
          {isNewMessage
            ? (
              <p class="green ml-auto mt-auto mb-auto rounded-full w-2 h-2 p-2">
                new!
              </p>
            )
            : ""}
        </a>
      </li>
    </>
  )
}

const isOnClickUndefind = (fn: (() => void) | null | undefined) => {
  if (fn === undefined || fn === null) {
    return () => {}
  }
  return fn
}
