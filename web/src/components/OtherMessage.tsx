import { atom, useAtom, useAtomValue } from "solid-jotai";
import { createEffect, createSignal } from "solid-js";
import { DEFAULT_ICON } from "./defaultIcon.ts";
import { iconsState, nickNamesState } from "../utils/state.ts";
import { ContextMenu } from "./ContextMenu";
import { getMessage } from "../utils/getMessage.ts";
import { selectedChannelState, selectedRoomState } from "../utils/roomState.ts";

// ユーザー情報の取得状態を追跡するグローバルMap
const fetchingUsers = new Map<
  string,
  Promise<{ icon: string; nickName: string }>
>();

const ChatOtherMessage = (
  { name, time, content, isPrimary, messageid, isFetch }: {
    name: string;
    time: string | number | Date;
    content: {
      verified: boolean;
      encrypted: boolean;
      content: string;
      type: string;
      timestamp: string | number | Date;
      original?: string | undefined;
    };
    messageid: string;
    isPrimary: boolean;
    isFetch: true | undefined;
  },
) => {
  const isPrimaryClass = isPrimary
    ? "c-talk-chat other primary"
    : "c-talk-chat other subsequent";
  const [icon, setIcon] = createSignal(DEFAULT_ICON);
  const [nickName, setNickName] = createSignal("");
  const [icons, setIcons] = useAtom(iconsState);
  const [nickNames, setNickNames] = useAtom(nickNamesState);

  // 右クリックメニュー用の状態
  const [showContextMenu, setShowContextMenu] = createSignal(false);
  const [contextMenuPosition, setContextMenuPosition] = createSignal({
    x: 0,
    y: 0,
  });

  // 右クリックイベントハンドラ
  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  // メッセージをコピー
  const copyMessage = () => {
    if (content.content) {
      navigator.clipboard.writeText(content.content)
        .then(() => alert("メッセージをクリップボードにコピーしました"))
        .catch((err) => console.error("コピーに失敗しました:", err));
    }
  };

  // ユーザーを報告
  const reportUser = () => {
    alert(`${name} を報告する機能は開発中です`);
  };

  // メニュー項目の定義
  const menuItems = [
    { label: "メッセージをコピー", onClick: copyMessage },
    { label: "ユーザーを報告", onClick: reportUser },
  ];

  createEffect(async () => {
    if (!isFetch) return;

    // ローカルステートから情報を取得
    const iconData = icons().find((value) => value.key === name);
    const nickNameData = nickNames().find((value) => value.key === name);

    // 既にアイコンとニックネームが取得済みの場合はそれを使用
    if (iconData) {
      setIcon(iconData.icon);
    }
    if (nickNameData) {
      setNickName(nickNameData.nickName);
    }

    // 両方とも取得済みならAPI呼び出しは不要
    if (iconData && nickNameData) {
      return;
    }

    // まだ取得処理中でないユーザーの場合、新しく取得処理を開始
    if (!fetchingUsers.has(name)) {
      const fetchUserInfo = async () => {
        const domain = name.split("@")[1];

        // 両方の情報を並行して取得
        const [iconResponse, nickNameResponse] = await Promise.all([
          fetch(`https://${domain}/_takos/v1/user/icon/${name}`).then((res) =>
            res.json()
          ),
          fetch(`https://${domain}/_takos/v1/user/nickName/${name}`).then(
            (res) => res.json(),
          ),
        ]);

        const iconBase64 = "data:image/png;base64," + iconResponse.icon;
        const nickNameValue = nickNameResponse.nickName;

        // グローバルstateに保存
        if (!iconData) {
          setIcons(
            (
              prev,
            ) => [...prev, { key: name, icon: iconBase64, type: "friend" }],
          );
        }
        if (!nickNameData) {
          setNickNames(
            (prev) => [...prev, {
              key: name,
              nickName: nickNameValue,
              type: "friend",
            }],
          );
        }

        return { icon: iconBase64, nickName: nickNameValue };
      };

      // 取得中のPromiseを保存
      fetchingUsers.set(name, fetchUserInfo());
    }

    try {
      // 取得が完了するのを待つ
      const result = await fetchingUsers.get(name);
      if (!result) return;
      if (!iconData) setIcon(result.icon);
      if (!nickNameData) setNickName(result.nickName);
    } catch (error) {
      console.error(`Failed to fetch user info for ${name}:`, error);
    }
  });

  return (
    <li class={isPrimaryClass}>
      <div
        class="c-talk-chat-box mb-1"
        onContextMenu={handleContextMenu}
      >
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

          {renderMessageContent(content,name)}
        </div>
        <div class="c-talk-chat-date">
          <p>{convertTime(time)}</p>
        </div>
      </div>

      {/* 右クリックメニュー */}
      {showContextMenu() && (
        <ContextMenu
          x={contextMenuPosition().x}
          y={contextMenuPosition().y}
          items={menuItems}
          onClose={() => setShowContextMenu(false)}
        />
      )}
    </li>
  );
};


export function renderMessageContent(content: {
  verified: boolean;
  encrypted: boolean;
  content: string;
  type: string;
  timestamp: string | number | Date;
  original?: string | undefined;
}, name: string) {
  switch (content.type) {
    case "text":
      return (
        <div class="c-talk-chat-msg" style={{ "user-select": "none" }}>
          <p>{convertLineBreak(content.content)}</p>
        </div>
      );
    
    case "image": {
      const contentValue: {
        uri: string;
        metadata: {
            filename: string;
            mimeType: string;
        };
      } = JSON.parse(content.content);
      return (
        ImageCompornent({
          src: `data:${contentValue.metadata.mimeType};base64,${contentValue.uri}`,
          senderId: name,
        })
      );
    }
    case "video": {
      const contentValue: {
        uri: string;
        metadata: {
            filename: string;
            mimeType: string;
        };
      } = JSON.parse(content.content);
      return (
        DirectVideoPlayer({
          videoUrl: `data:${contentValue.metadata.mimeType};base64,${contentValue.uri}`,
          videoType: contentValue.metadata.mimeType,
          filename: contentValue.metadata.filename,
          senderName: name,
        })
      );
    }
    case "thumbnail": {
      const contentValue: {
        originalType: "image" | "video";
        thumbnailUri: string;       // 実際の画像/動画サムネイル
        thumbnailMimeType: string;
      } = JSON.parse(content.content);
      console.log(content)
      if(contentValue.originalType === "image") {
        return (
          ImageCompornent({
            src: `data:${contentValue.thumbnailMimeType};base64,${contentValue.thumbnailUri}`,
            original: content.original,
            senderId: name,
          })
        );
      }
      if(contentValue.originalType === "video") {
        return (
          VideoPlayerComponent({
            content,
            senderName: name,
          })
        );
      }
      return (
        <>
        </>
      );
    }
  }
}

// ビデオプレーヤーの状態管理用のatom
export const videoPlayerState = atom<{
  isOpen: boolean;
  videoUrl: string | null;
  videoType: string | null;
}>({
  isOpen: false,
  videoUrl: null,
  videoType: null,
});

const VideoPlayerComponent = ({
  content,
  senderName,
}: {
  content: {
    verified: boolean;
    encrypted: boolean;
    content: string;
    type: string;
    timestamp: string | number | Date;
    original?: string;
  };
  senderName: string;
}) => {
  const sellectedRoom = useAtomValue(selectedRoomState);
  const [, setVideoPlayer] = useAtom(videoPlayerState);
  const [isLoading, setIsLoading] = createSignal(false);
  const [loadingProgress, setLoadingProgress] = createSignal(0);
  
  // ローディングアニメーションのための効果
  createEffect(() => {
    if (!isLoading()) return;
    
    // ローディングの進捗表現のためのインターバル
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        const next = prev + Math.random() * 10;
        return next >= 100 ? 0 : next; // 100%に達したらリセット
      });
    }, 200);
    
    return () => clearInterval(interval);
  });

  const handlePlayVideo = async () => {
    if (!content.original || !sellectedRoom) {
      alert("オリジナルビデオが利用できません");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const originalVideo = await getMessage({
        messageid: content.original,
        roomId: sellectedRoom()!.roomid,
        type: sellectedRoom()!.type,
        senderId: senderName,
      });
      
      const videoValue = JSON.parse(originalVideo.value.content);
      const videoDataURI = `data:${videoValue.metadata.mimeType};base64,${videoValue.uri}`;
      
      // ビデオプレーヤーモーダルを表示
      setVideoPlayer({
        isOpen: true,
        videoUrl: videoDataURI,
        videoType: videoValue.metadata.mimeType,
      });
    } catch (error) {
      console.error("ビデオの読み込みに失敗しました", error);
      alert("ビデオの読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  // サムネイル情報は message.content 内の JSON から取得
  const contentValue = JSON.parse(content.content);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <img
        src={`data:${contentValue.thumbnailMimeType};base64,${contentValue.thumbnailUri}`}
        alt="video thumbnail"
        class="max-w-full max-h-64 rounded cursor-pointer"
        style={{ 
          "filter": isLoading() ? "brightness(0.7)" : "none",
          "transition": "filter 0.3s ease"
        }}
      />
      <button
        onClick={handlePlayVideo}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          "font-size": "2rem",
          background: isLoading() ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)",
          color: "white",
          border: "none",
          "border-radius": "50%",
          width: "60px",
          height: "60px",
          cursor: isLoading() ? "wait" : "pointer",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "transition": "all 0.3s ease",
        }}
        disabled={isLoading()}
      >
        {isLoading() ? (
          <div style={{ position: "relative", width: "40px", height: "40px" }}>
            {/* 外側の回転するリング */}
            <div class="w-10 h-10 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            {/* 内側の回転するリング（逆方向） */}
            <div class="absolute top-1/2 left-1/2 w-6 h-6 -mt-3 -ml-3 border-2 border-blue-400 border-b-transparent rounded-full animate-spin" 
                 style={{ "animation-direction": "reverse", "animation-duration": "0.8s" }}></div>
            {/* 中央の点滅する点 */}
            <div class="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 bg-white rounded-full animate-pulse"></div>
            
            {/* ローディングテキスト */}
            <div class="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-white whitespace-nowrap">
              読み込み中...
            </div>
          </div>
        ) : (
          <span style={{ "margin-left": "3px" }}>▶</span>
        )}
      </button>
    </div>
  );
};
// ビデオプレーヤーモーダルコンポーネント
export function VideoPlayer() {
  const [videoPlayer, setVideoPlayer] = useAtom(videoPlayerState);
  
  const closePlayer = () => {
    setVideoPlayer({
      isOpen: false,
      videoUrl: null,
      videoType: null,
    });
  };

  return (
    <>
      {videoPlayer().isOpen && (
        <div 
          class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closePlayer}
        >
          <div 
            class="relative max-w-[90%] max-h-[90%] bg-black p-2 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <video 
              controls 
              autoplay 
              class="max-w-full max-h-[80vh]"
            >
              <source src={videoPlayer().videoUrl!} type={videoPlayer().videoType!} />
              お使いのブラウザはビデオタグをサポートしていません。
            </video>
            
            <button 
              class="absolute top-2 right-2 bg-white bg-opacity-70 rounded-full p-2 text-black hover:bg-opacity-100"
              onClick={closePlayer}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export const zoomedImageState = atom<{
  isOpen: boolean;
  original?: string | null;
  imageUrl: string | null;
  senderId: string | null;
}>({
  isOpen: false,
  senderId: null,
  original: null,
  imageUrl: null,
});

export function ImageViewer() {
  const [zoomedImage, setZoomedImage] = useAtom(zoomedImageState);
  const [isShowingOriginal, setIsShowingOriginal] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false); // 読み込み状態を管理するSignal
  const sellectedRoom = useAtomValue(selectedRoomState);
  
  const closeViewer = () => {
    setZoomedImage({
      isOpen: false,
      original: null,
      imageUrl: null,
      senderId: null,
    });
    setIsShowingOriginal(false);
    setIsLoading(false);
  };

  const toggleOriginal = async (e: { stopPropagation: () => void; }) => {
    e.stopPropagation();
    
    // サムネイルに戻る場合はロード不要
    if (isShowingOriginal()) {
      setIsShowingOriginal(false);
      return;
    }
    
    const originalMessageId = zoomedImage().original;
    const roomId = sellectedRoom()!.roomid;
    const type = sellectedRoom()!.type;
    const senderId = zoomedImage().senderId;
    if (!originalMessageId || !roomId || !type || !senderId) return;
    
    setIsLoading(true); // 読み込み開始
    
    try {
      const originalImage = await getMessage({
        messageid: originalMessageId,
        roomId,
        type,
        senderId,
      });
      console.log(originalImage);
      const imageValue = JSON.parse(originalImage.value.content);
      const image = imageValue.uri;
      console.log(image);
      setZoomedImage({
        ...zoomedImage(),
        imageUrl: `data:${imageValue.metadata.mimeType};base64,${image}`,
      });
      setIsShowingOriginal(true);
    } catch (error) {
      console.error("オリジナル画像の読み込みに失敗しました:", error);
    } finally {
      setIsLoading(false); // 読み込み完了
    }
  };

  return (
    <>
      {zoomedImage().isOpen && (
        <div 
          class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closeViewer}
        >
          <div class="relative max-w-[90%] max-h-[90%]">
            <img 
              src={zoomedImage().imageUrl!} 
              alt="拡大画像" 
              class="max-w-full max-h-[90vh] object-contain"
            />
            
            {/* ローディングオーバーレイ */}
            {isLoading() && (
              <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40">
                <div class="loading-spinner"></div>
              </div>
            )}
            
            <button 
              class="absolute top-2 right-2 bg-white bg-opacity-70 rounded-full p-2 text-black hover:bg-opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                closeViewer();
              }}
            >
              ✕
            </button>
            
            {zoomedImage().original && (
              <button 
                class="absolute bottom-2 right-2 bg-white bg-opacity-70 rounded-md px-3 py-1 text-black hover:bg-opacity-100 text-sm"
                onClick={toggleOriginal}
                disabled={isLoading()} // 読み込み中はボタンを無効化
              >
                {isShowingOriginal() ? "サムネイルを表示" : "オリジナルを表示"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ImageCompornent({
  src,
  original,
  senderId,
}: {
  src: string;
  original?: string;
  senderId: string;
}) {
  const [, setZoomedImage] = useAtom(zoomedImageState);

  const handleImageClick = () => {
    setZoomedImage({
      isOpen: true,
      original: original,
      imageUrl: src,
      senderId: senderId,
    });
  };

  return (
    <img
      src={src}
      alt="送信された画像"
      class="max-w-full max-h-64 rounded cursor-pointer"
      onClick={handleImageClick}
    />
  );
}

export function convertLineBreak(message: string | null | undefined) {
  if (message === null || message === undefined) return;
  const messageValue = JSON.parse(message) as { text: string; format: string };
  if(messageValue.format === "text") {
    return messageValue.text.split("\n").map((line, index) => (
      <span>
        {line}
        <br />
      </span>
    ))
  }
  if(messageValue.format === "markdown") {
    return messageValue.text;
  }
}

export function convertTime(time: string | number | Date) {
  const date = new Date(time);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "午後" : "午前";
  const hour = hours % 12;
  const zeroPaddingHour = hour === 0 ? 12 : hour;
  const zeroPaddingMinutes = String(minutes).padStart(2, "0");
  return `${ampm} ${zeroPaddingHour}:${zeroPaddingMinutes}`;
}

// 圧縮されていない動画プレーヤーコンポーネント
const DirectVideoPlayer = ({
  videoUrl,
  videoType,
  filename,
  senderName,
}: {
  videoUrl: string;
  videoType: string;
  filename: string;
  senderName: string;
}) => {
  const [, setVideoPlayer] = useAtom(videoPlayerState);
  const [isPlaying, setIsPlaying] = createSignal(false);

  const handlePlayVideo = () => {
    setVideoPlayer({
      isOpen: true,
      videoUrl: videoUrl,
      videoType: videoType,
    });
  };

  return (
    <div class="video-container" style={{ "max-width": "400px", "margin": "4px 0" }}>
      <div 
        style={{ 
          position: "relative", 
          display: "inline-block",
          "border-radius": "8px",
          overflow: "hidden",
          "border": "1px solid rgba(0,0,0,0.1)",
          "box-shadow": "0 1px 3px rgba(0,0,0,0.1)"
        }}
      >
        <div style={{ width: "100%", "max-width": "300px", position: "relative" }}>
          <video 
            class="video-preview" 
            style={{ width: "100%", "max-height": "180px", "object-fit": "cover" }}
            poster=""
            onClick={handlePlayVideo}
          >
            <source src={videoUrl} type={videoType} />
            お使いのブラウザはこの動画をサポートしていません。
          </video>
          
          <button
            onClick={handlePlayVideo}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.5)",
              color: "white",
              border: "none",
              "border-radius": "50%",
              width: "50px",
              height: "50px",
              cursor: "pointer",
              display: "flex",
              "align-items": "center",
              "justify-content": "center"
            }}
          >
            <span style={{ "margin-left": "3px" }}>▶</span>
          </button>
        </div>
        
        <div style={{ 
          padding: "8px", 
          "font-size": "0.9rem",
          display: "flex",
          "justify-content": "space-between",
          "align-items": "center",
          background: "rgba(250,250,250,0.8)"
        }}>
          <div style={{ 
            overflow: "hidden", 
            "text-overflow": "ellipsis", 
            "white-space": "nowrap",
            "max-width": "220px"
          }}>
            {filename}
          </div>
          <button
            onClick={handlePlayVideo}
            style={{
              background: "#3b82f6",
              color: "white",
              border: "none",
              padding: "4px 8px",
              "border-radius": "4px",
              "font-size": "0.8rem",
              cursor: "pointer"
            }}
          >
            再生
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatOtherMessage;
