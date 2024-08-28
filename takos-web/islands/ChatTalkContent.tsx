import ChatDate from "../components/ChatDate.tsx";
import ChatSendMessage from "../components/SendMessage.tsx";
import ChatOtherMessage from "../components/OtherMessage.tsx";
import { AppStateType } from "../util/types.ts";
import { splitUserName } from "../util/takosClient.ts";
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
      {
        /*
      {state.talkData.value.map((data: any, index: number) => {
        const date = new Date(data.timestamp);
        const isEncodeDate = new Date(DateState).toLocaleDateString() !==
          date.toLocaleDateString();
        DateState = data.timestamp;

        if (data.type === "text") {
          console.log(
            splitUserName(data.userName).domain,
            window.location.host,
          );
          if (
            state.userName === splitUserName(data.userName).userName &&
            splitUserName(data.userName).domain === window.location.host
          ) {
            if (SendPrimary) {
              SendPrimary = false;
              OtherPrimary = true;
              return (
                <>
                  {isEncodeDate && <ChatDate date={new Date(data.timestamp)} />}
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

            // 前のメッセージから1時間以上経過のものはprimaryに
            const prevDate = index > 0
              ? new Date(state.talkData.value[index - 1].timestamp)
              : null;
            if (prevDate && (date.getTime() - prevDate.getTime() > 3600000)) {
              return (
                <>
                  {isEncodeDate && <ChatDate date={new Date(data.timestamp)} />}
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
                {isEncodeDate && <ChatDate date={new Date(data.timestamp)} />}
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
              return (
                <>
                  {isEncodeDate && <ChatDate date={new Date(data.timestamp)} />}
                  <ChatOtherMessage
                    time={data.timestamp}
                    message={data.message}
                    name={data.userName}
                    nickName={data.nickName}
                    isPrimary={true}
                  />
                </>
              );
            }

            // 前のメッセージから1時間以上経過のものはprimaryに
            const prevDate = index > 0
              ? new Date(state.talkData.value[index - 1].timestamp)
              : null;
            if (prevDate && (date.getTime() - prevDate.getTime() > 3600000)) {
              return (
                <>
                  {isEncodeDate && <ChatDate date={new Date(data.timestamp)} />}
                  <ChatOtherMessage
                    time={data.timestamp}
                    message={data.message}
                    name={data.userName}
                    nickName={data.nickName}
                    isPrimary={true}
                  />
                </>
              );
            }

            return (
              <>
                {isEncodeDate && <ChatDate date={new Date(data.timestamp)} />}
                <ChatOtherMessage
                  time={data.timestamp}
                  message={data.message}
                  name={data.userName}
                  nickName={data.nickName}
                  isPrimary={false}
                />
              </>
            );
          }
        } else {
          return <ChatDate date={new Date(data.timestamp)} />;
        }
      })}
      */
      }
    </>
  );
}

function ChatTalk({ state }: { state: AppStateType }) {
  if (state.isChoiceUser.value === true) {
    if (state.isCreateRoom.value) {
      return (
        <ul className="c-talk-chat-list">
          <ChatTalkMain state={state} />
        </ul>
      );
    } else {
      return (
        <div className="flex w-full h-full">
          <div class="m-auto">
            <p className="">トークルームを作成してください</p>
            <div class="w-full">
              <button class="mx-auto block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                作成する
              </button>
            </div>
          </div>
        </div>
      );
    }
  } else {
    return (
      <div className="flex w-full h-full">
        <p className="m-auto">友達を選択してください</p>
      </div>
    );
  }
}

export default ChatTalk;
