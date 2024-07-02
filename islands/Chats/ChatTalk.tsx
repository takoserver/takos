import ChatDate from "../../components/Chats/ChatDate.tsx"
import ChatSendMessage from "../../components/Chats/ChatSendMessage.tsx"
import ChatOtherMessage from "../../components/Chats/ChatOtherMessage.tsx"
export default function ChatTalk(props: any) {
    if (props.isSelectUser) {
        return (
            <>
                <TalkArea
                    roomid={props.roomid}
                    ws={props.ws}
                    isSelectUser={props.isSelectUser}
                    userName={props.userName}
                    setWs={props.setWs}
                    setSessionid={props.setSessionid}
                    setIsChoiceUser={props.setIsChoiceUser}
                    setRoomid={props.setRoomid}
                    roomName={props.roomName}
                    talkData={props.talkData}
                    sessionid={props.sessionid}
                />
            </>
        )
    }
    return (
        <>
            <div class="text-center">
                トークを始めましょう！！
            </div>
        </>
    )
}
function TalkArea(props: any) {
    let SendPrimary = true
    let OtherPrimary = true
    let DateState: any
    return (
        <>
            <div class="p-talk-chat-main" id="chat-area">
                <div class="p-talk-chat-title">
                    <div class="p-1 h-full">
                        <button
                            class="p-talk-chat-prev"
                            onClick={() => {
                                //なぜか送れない
                                props.ws.send(
                                    JSON.stringify({
                                        type: "leave",
                                        sessionid: props.sessionid,
                                    }),
                                )
                                props.setIsChoiceUser(false)
                                props.setRoomid("")
                                //urlを変更
                                history.pushState("", "", "/talk")
                            }}
                        >
                            <svg
                                role="img"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                stroke="#000000"
                                stroke-width="1.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                fill="none"
                            >
                                <polyline points="14 18 8 12 14 6 14 6" />
                            </svg>
                        </button>
                    </div>
                    <p>{props.roomName}</p>
                </div>
                <ul class="p-talk-chat-main__ul">
                    {props.talkData.map((data: any, index: number) => {
                        const date = new Date(data.time)

                        const isEncodeDate = new Date(DateState).toLocaleDateString() !==
                            date.toLocaleDateString()
                        DateState = data.time
                        if (data.type == "message") {
                            if (data.sender == props.userName) {
                                if (SendPrimary) {
                                    SendPrimary = false
                                    OtherPrimary = true
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
                                    )
                                }
                                // 前のメッセージから1分以上経過のものはprimaryに
                                const prevDate = new Date(props.talkData[index - 1].time)
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
                                    )
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
                                )
                            } else {
                                if (OtherPrimary) {
                                    OtherPrimary = false
                                    SendPrimary = true
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
                                    )
                                }

                                // 前のメッセージから1分以上経過のものはprimaryに
                                const prevDate = new Date(props.talkData[index - 1].time)
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
                                    )
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
                                )
                            }
                        } else {
                            return <ChatDate date={new Date(data.time)} />
                        }
                    })}
                </ul>
            </div>
        </>
    )
}
