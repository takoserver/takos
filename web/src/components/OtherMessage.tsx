import { atom, useAtom } from "solid-jotai";
import { createEffect, createSignal } from "solid-js";

const ChatOtherMessage = (
  { name, time, message, isPrimary }: any,
) => {
  const isPrimaryClass = isPrimary
    ? "c-talk-chat other primary"
    : "c-talk-chat other subsequent";
  
  const [friendInfo,setFreindInfo] = useAtom(friendInfoState)
  const [icon,setIcon] = createSignal("")
  const [nickName,setNickName] = createSignal("")
  createEffect(async () => {
    if(friendInfo().find((value) => value[0] === name)) {
      const data = friendInfo().find((value) => value[0] === name)

      if(data) {
        setIcon(data[1].icon)
        setNickName(data[1].nickName)
      }
    }
    const iconURL = `https://${name.split("@")[1]}/_takos/v2/friend/info?userName=${name.split("@")[0]}`
    const res = await fetch(iconURL)
    const data = await res.json()
    const icon = "data:image/png;base64," + data.icon
    const nickName = data.nickName
    setIcon(icon)
    setNickName(nickName)
    setFreindInfo([name,{icon,nickName}])
  })
  return (
    <li class={isPrimaryClass}>
      <div class="c-talk-chat-box mb-1">
        {isPrimary && (
          <div class="c-talk-chat-icon">
            <img
              src={icon()}
              alt="image"
              class="rounded-full text-white dark:text-black"
            />
          </div>
        )}
        <div class="c-talk-chat-right">
          {isPrimary && (
            <div class="c-talk-chat-name">
              <p>{nickName()}</p>
            </div>
          )}
          <div class="c-talk-chat-msg">
            <p>
              {convertLineBreak(message)}
            </p>
          </div>
        </div>
        <div class="c-talk-chat-date">
          <p>{convertTime(time)}</p>
        </div>
      </div>
    </li>
  );
};
//preactで動作する改行を反映させるために、改行コードをbrタグに変換する関数
function convertLineBreak(message: string | null | undefined) {
  if (message === null || message === undefined) return;
  return message.split("\n").map((line, index) => (
    <span>
      {line}
      <br />
    </span>
  ));
}
//Date型のデータを受け取り、午前か午後何時何分かを返す関数
function convertTime(time: string | number | Date) {
  const date = new Date(time);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "午後" : "午前";
  const hour = hours % 12;
  const zeroPaddingHour = hour === 0 ? 12 : hour;
  const zeroPaddingMinutes = String(minutes).padStart(2, "0");
  return `${ampm} ${zeroPaddingHour}:${zeroPaddingMinutes}`;
}
export default ChatOtherMessage;

const friendInfoState = atom<[string,{
  icon: string
  nickName: string
}][]>([])