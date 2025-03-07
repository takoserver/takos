import {
  isSelectRoomState,
  selectedChannelState,
  selectedRoomState,
} from "../utils/roomState";
import { messageListState, messageValueState } from "../utils/state.ts";
import { atom, useAtom } from "solid-jotai";
import ChatSendMessage from "./SendMessage.tsx";
import ChatOtherMessage from "./OtherMessage.tsx";
import { createEffect, createSignal, onMount, For } from "solid-js";
import { groupChannelState } from "./Chat/SideBar.tsx";
import { MessageData, MessageContentType } from "../types/message";
import { getCachedMessage } from "../utils/messageCache";
import { ChannelSideBar } from "./ChannelSideBar.tsx";
import { Transition } from "solid-transition-group";

// ローカルユーザー名を取得
const myuserName = localStorage.getItem("userName") + "@" + document.location.hostname;

// 状態管理
export const messagesState = atom<MessageData[]>([]);
export const isLoadedMessageState = atom(false);
export const processedMessageIdsState = atom<Set<string>>(new Set<string>());
export const messageTimeLineState = atom<MessageData[]>([]);
export const showCreateChannelModalState = atom(false);
export const showEditChannelModalState = atom(false);
export const contextMenuPositionState = atom<
  { x: number; y: number; type: "channel" | "category" | null; id: string }
>({ x: 0, y: 0, type: null, id: "" });

// メッセージロード処理
function useMessageLoader() {
  const [processedMessageIds, setProcessedMessageIds] = useAtom(processedMessageIdsState);
  const [messageList] = useAtom(messageListState);
  const [loaded, setLoaded] = useAtom(isLoadedMessageState);
  const [selectedRoom] = useAtom(selectedRoomState);
  const [messages, setMessages] = useAtom(messagesState);
  const [messageTimeLine, setMessageTimeLine] = useAtom(messageTimeLineState);

  const loadMessages = async () => {
    const currentMessageList = messageList();
    const roomid = selectedRoom()?.roomid;
    const type = selectedRoom()?.type;
    
    // 基本チェック
    if (currentMessageList.length === 0) {
      setMessageTimeLine([]);
      setLoaded(true);
      return;
    }

    if (!roomid || !type) {
      return;
    }

    // ルームが変わったら処理済みIDリストをリセット
    if (messages().length > 0 && messages()[0].roomid !== roomid) {
      setMessages([]);
      setProcessedMessageIds(() => new Set<string>());
    }

    // まだ処理していないメッセージだけをフィルタリング
    const newMessages = currentMessageList.filter(
      (msg) => !processedMessageIds().has(`${msg.messageid}-${roomid}`),
    );

    // 新規メッセージがない場合
    if (newMessages.length === 0) {
      setLoaded(true);
      // 既存メッセージから情報を取得
      const result = messageList().map((messageIds) => 
        messages().find((msg) => msg.messageid === messageIds.messageid)
      ).filter(Boolean) as MessageData[];
      
      setMessageTimeLine(result);
      return;
    }

    // 新規メッセージを処理
    const processedIds = new Set(processedMessageIds());
    const messagesResult = await Promise.all(
      newMessages.map(async (message) => {
        // 処理済みとしてマーク
        processedIds.add(`${message.messageid}-${roomid}`);
        return getCachedMessage(message.messageid, roomid, type, message.userName);
      }),
    );

    // 新しいメッセージを既存のメッセージに追加
    setProcessedMessageIds(processedIds);
    const validMessages = messagesResult.filter(Boolean);
    
    if (validMessages.length > 0) {
      setMessages((prev) => [...prev, ...validMessages]);

      // タイムラインの構築
      const allMessages = [...messages(), ...validMessages];
      const uniqueMessages = new Map<string, MessageData>();
      
      // 重複を排除して最新のメッセージを保持
      allMessages.forEach((msg) => uniqueMessages.set(msg.messageid, msg));

      // メッセージIDリストの順序に従ってメッセージを並べる
      const result = messageList()
        .map((messageIds) => uniqueMessages.get(messageIds.messageid))
        .filter(Boolean) as MessageData[];

      setMessageTimeLine(result);
    }
    
    setLoaded(true);
  };

  return { loadMessages };
}

// メッセージ表示コンポーネント
function MessageDisplay({ message }: { message: MessageData }) {
  const [show, setShow] = createSignal(false);
  
  // コンポーネントがマウントされたら表示アニメーションを開始
  onMount(() => {
    setTimeout(() => setShow(true), 50);
  });
  
  const messageContent = () => {
    if (message.serverData.userName === myuserName) {
      return (
        <ChatSendMessage
          time={message.serverData.timestamp}
          content={{
            verified: message.verified,
            encrypted: message.encrypted,
            content: message.content,
            type: message.type as MessageContentType,
            timestamp: message.timestamp,
            original: message.original,
          }}
          messageid={message.messageid}
          isPrimary={true}
          isSendPrimary={true}
        />
      );
    } else {
      return (
        <ChatOtherMessage
          name={message.serverData.userName}
          time={message.serverData.timestamp}
          content={{
            verified: message.verified,
            encrypted: message.encrypted,
            content: message.content,
            type: message.type,
            timestamp: message.timestamp,
            original: message.original,
          }}
          messageid={message.messageid}
          isPrimary={true}
          isFetch={true}
        />
      );
    }
  };
  
  return (
    <div 
      class="message-container" 
      classList={{ "message-show": show() }}
      style={{
        "opacity": show() ? "1" : "0",
        "transform": show() ? "translateY(0)" : "translateY(10px)",
        "transition": "opacity 0.3s ease, transform 0.3s ease"
      }}
    >
      {messageContent()}
    </div>
  );
}

// メッセージリストコンポーネント
function ChatTalkMain() {
  const { loadMessages } = useMessageLoader();
  const [messageList] = useAtom(messageListState);
  const [loaded] = useAtom(isLoadedMessageState);
  const [messageTimeLine] = useAtom(messageTimeLineState);
  const [prevMessageCount, setPrevMessageCount] = createSignal(0);
  const [shouldAutoScroll, setShouldAutoScroll] = createSignal(true);
  
  // SolidJSの正しいref設定方法
  const [chatListRef, setChatListRef] = createSignal<HTMLDivElement>();

  // メッセージのロード
  createEffect(() => {
    loadMessages();
  });

  // スクロール位置検出
  const handleScroll = (e: Event) => {
    const element = e.target as HTMLDivElement;
    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  // スクロール管理の修正
  createEffect(() => {
    const currentMessageCount = messageTimeLine().length;
    const element = chatListRef();
    
    if (element && currentMessageCount > 0) {
      // 新しいメッセージが追加された場合のみ自動スクロール
      if (currentMessageCount > prevMessageCount() && shouldAutoScroll()) {
        setTimeout(() => {
          element.scrollTo({
            top: element.scrollHeight,
            behavior: "smooth"
          });
        }, 100);
      }
      
      setPrevMessageCount(currentMessageCount);
    }
  });

  return (
    <div 
      class="pl-2 h-full overflow-y-auto flex flex-col scroll-smooth" 
      id="chatList" 
      ref={setChatListRef}
      onScroll={handleScroll}
      style={{ 
        "max-height": "calc(100vh - 120px)",
        "scroll-behavior": "smooth"
      }}
    >
      {loaded() ? (
        <For each={messageTimeLine()}>
          {(message) => <MessageDisplay message={message} />}
        </For>
      ) : (
        <div class="flex w-full h-full">
          <p class="m-auto">読み込み中...</p>
        </div>
      )}
    </div>
  );
}

// メインコンポーネント
function ChatTalk() {
  const [isChoiceUser] = useAtom(isSelectRoomState);
  
  return (
    <>
      {isChoiceUser() ? (
        <ul class="c-talk-chat-list">
          <ChannelSideBar />
          <ChatTalkMain />
        </ul>
      ) : (
        <div class="flex w-full h-full">
          <p class="m-auto">友達を選択してください</p>
        </div>
      )}
    </>
  );
}

export default ChatTalk;

