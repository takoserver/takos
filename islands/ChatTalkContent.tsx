import ChatDate from "../components/ChatDate.tsx";
import ChatSendMessage from "../components/SendMessage.tsx";
import ChatOtherMessage from "../components/OtherMessage.tsx";
import { AppStateType } from "../util/types.ts";
function ChatTalkMain({ state }: { state: AppStateType }) {
  let SendPrimary = true;
  let OtherPrimary = true;
  let DateState: any;
  return (
    <>
      {state.talkData.value.map((data: any, index: number) => {
        const date = new Date(data.time);

        const isEncodeDate = new Date(DateState).toLocaleDateString() !==
          date.toLocaleDateString();
        DateState = data.time;
        if (data.type == "message") {
          if (data.sender == state.userName) {
            if (SendPrimary) {
              SendPrimary = false;
              OtherPrimary = true;
              return (
                <>
                  {isEncodeDate && (
                    <ChatDate
                      date={new Date(data.time)}
                    />
                  )}
                  <ChatSendMessage
                    isRead={data.isRead}
                    time={data.time}
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
                      date={new Date(data.time)}
                    />
                  )}
                  <ChatSendMessage
                    isRead={data.isRead}
                    time={data.time}
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
                    date={new Date(data.time)}
                  />
                )}
                <ChatSendMessage
                  isRead={data.isRead}
                  time={data.time}
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
                    sender={data.sender}
                    senderNickName={data.senderNickName}
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
                    sender={data.sender}
                    senderNickName={data.senderNickName}
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
                  sender={data.sender}
                  senderNickName={data.senderNickName}
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

export default ChatTalkMain;
