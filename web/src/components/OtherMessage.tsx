import { atom, useAtom } from "solid-jotai";
import { createEffect, createSignal } from "solid-js";

const DEFAULT_ICON =
  "data:image/png;base64,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";
const ChatOtherMessage = (
  { name, time, message, isPrimary, messageid, isFetch }: {
    name: string;
    time: string | number | Date;
    message: () => [string, {
      verified: boolean;
      encrypted: boolean;
      content: string;
      type: string;
      timestamp: string;
    }][];
    messageid: string;
    isPrimary: boolean;
    isFetch: true | undefined;
  },
) => {
  if (!message) return null;
  const isPrimaryClass = isPrimary
    ? "c-talk-chat other primary"
    : "c-talk-chat other subsequent";

  const [friendInfo, setFreindInfo] = useAtom(friendInfoState);
  const [icon, setIcon] = createSignal(DEFAULT_ICON);
  const [nickName, setNickName] = createSignal("");
  createEffect(async () => {
    if (friendInfo().find((value) => value[0] === name)) {
      const data = friendInfo().find((value) => value[0] === name);

      if (data) {
        setIcon(data[1].icon);
        setNickName(data[1].nickName);
      }
      return;
    }
    if (!isFetch) return;
    const icon = "data:image/png;base64," +
      (await (await fetch(
        `https://${name.split("@")[1]}/_takos/v1/user/icon/${name}`,
      )).json()).icon;
    const nickName = (await (await fetch(
      `https://${name.split("@")[1]}/_takos/v1/user/nickName/${name}`,
    )).json()).nickName;
    setIcon(icon);
    setNickName(nickName);
    setFreindInfo((prev) => [...prev, [name, { icon, nickName }]]);
  });

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
              {(() => {
                try {
                  const foundMessage = message().find((value) =>
                    value[0] === messageid
                  );
                  return foundMessage
                    ? convertLineBreak(foundMessage[1].content)
                    : null;
                } catch (e) {
                  return null;
                }
              })()}
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

const friendInfoState = atom<[string, {
  icon: string;
  nickName: string;
}][]>([]);
