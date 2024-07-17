import ChatDate from "../components/ChatDate.tsx";
import ChatSendMessage from "../components/SendMessage.tsx";
import ChatOtherMessage from "../components/OtherMessage.tsx";
import { AppStateType } from "../util/types.ts";
interface Messages {
  messageid: string;
  userName: string;
  messages: string;
  timestamp: string;
  type: string;
}
function ChatTalkMain({ state }: { state: AppStateType }) {
  let SendPrimary = true;
  let OtherPrimary = true;
  let DateState: any;
  return (
    <>
      {state.talkData.value.map((data: any, index: number) => {
        const date = new Date(data.timestamp);
        const isEncodeDate = new Date(DateState).toLocaleDateString() !==
          date.toLocaleDateString();
        DateState = data.timestamp;
        if (data.type == "text") {
          if (data.userName == state.userName) {
            if (SendPrimary) {
              SendPrimary = false;
              OtherPrimary = true;
              return (
                <>
                  {isEncodeDate && (
                    <ChatDate
                      date={new Date(data.timestamp)}
                    />
                  )}
                  <ChatSendMessage
                    isRead={data.isRead}
                    time={data.timestamp}
                    message={data.message}
                    isPrimary={true}
                    isSendPrimary={true}
                  />
                </>
              );
            }
            // 前のメッセージから1分以上経過のものはprimaryに
            const prevDate = new Date(state.talkData.value[index - 1].time);
            if (date.getTime() - prevDate.getTime() > 60000) {
              return (
                <>
                  {isEncodeDate && (
                    <ChatDate
                      date={new Date(data.timestamp)}
                    />
                  )}
                  <ChatSendMessage
                    isRead={data.isRead}
                    time={data.timestamp}
                    message={data.message}
                    isPrimary={true}
                    isSendPrimary={false}
                  />
                </>
              );
            }

            return (
              <>
                {isEncodeDate && (
                  <ChatDate
                    date={new Date(data.timestamp)}
                  />
                )}
                <ChatSendMessage
                  isRead={data.isRead}
                  time={data.timestamp}
                  message={data.message}
                  isPrimary={false}
                  isSendPrimary={false}
                />
              </>
            );
          } else {
            if (OtherPrimary) {
              OtherPrimary = false;
              SendPrimary = true;
              console.log(data);
              return (
                <>
                  {isEncodeDate && (
                    <ChatDate
                      date={new Date(data.time)}
                    />
                  )}
                  <ChatOtherMessage
                    time={data.time}
                    message={data.message}
                    name={data.userName}
                    nickName={data.nickName}
                    isPrimary={true}
                  />
                </>
              );
            }
            // 前のメッセージから1分以上経過のものはprimaryに
            const prevDate = new Date(state.talkData.value[index - 1].time);
            if (date.getTime() - prevDate.getTime() > 60000) {
              return (
                <>
                  {isEncodeDate && (
                    <ChatDate
                      date={new Date(data.time)}
                    />
                  )}
                  <ChatOtherMessage
                    time={data.time}
                    message={data.message}
                    name={data.nickName}
                    nickName={data.nickName}
                    isPrimary={true}
                  />
                </>
              );
            }
            return (
              <>
                {isEncodeDate && (
                  <ChatDate
                    date={new Date(data.time)}
                  />
                )}
                <ChatOtherMessage
                  time={data.time}
                  message={data.message}
                  name={data.nickName}
                  userName={data.userName}
                  nickName={data.nickName}
                  isPrimary={false}
                />
              </>
            );
          }
        } else {
          return <ChatDate date={new Date(data.time)} />;
        }
      })}
    </>
  );
}
function ChatTalk({ state }: { state: AppStateType }) {
  if (state.isChoiceUser.value === true) {
    return (
      <ul class="c-talk-chat-list">
        <ChatTalkMain state={state} />
      </ul>
    );
  } else {
    return (
      <div class="flex w-full h-full">
        <p class="m-auto">友達を選択してください</p>
      </div>
    );
  }
}
export default ChatTalk;
