const ChatSendMessage = ({ time, message, isPrimary, isSendPrimary }: {
  time: string;
  message: () => {
    verified: boolean;
    encrypted: boolean;
    content: string;
    type: string;
    timestamp: string;
  }
  isPrimary: boolean;
  isSendPrimary: boolean;
}) => {
  const isPrimaryClass = `c-talk-chat self ${
    isPrimary ? "primary" : "subsequent"
  }${isSendPrimary ? " mt-2" : ""}`;
  return (
    <li class={isPrimaryClass}>
      <div class="c-talk-chat-box mb-[3px]">
        <div class="c-talk-chat-date">
          <p>{convertTime(time)}</p>
        </div>
        <div class="c-talk-chat-right">
          <div class="c-talk-chat-msg">
            <p class="">
              {convertLineBreak(message().content)}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
};
export default ChatSendMessage;

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
//preactで動作する改行を反映させるために、改行コードをbrタグに変換する関数
function convertLineBreak(message: string | null | undefined) {
  if (message === null || message === undefined) return;
  return message.split("\n").map((line) => (
    <span>
      {line}
      <br />
    </span>
  ));
}
