import { atom, useAtom } from "solid-jotai";
import { createEffect, createSignal } from "solid-js";
import { getMessage } from "../utils/getMessage";
import { selectedRoomState } from "../utils/roomState";

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

export const VideoPlayerComponent = ({
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
  const sellectedRoom = () => useAtom(selectedRoomState)[0];
  const [, setVideoPlayer] = useAtom(videoPlayerState);
  const [isLoading, setIsLoading] = createSignal(false);
  const [aspectRatio, setAspectRatio] = createSignal(0);

  const contentValue = JSON.parse(content.content);

  const onThumbnailLoad = (e: Event) => {
    const img = e.target as HTMLImageElement;
    setAspectRatio(img.naturalWidth / img.naturalHeight);
  };

  createEffect(() => {
    if (!isLoading()) return;
    const interval = setInterval(() => {
      // ローディングアニメーションの実装例（詳細は各自調整）
    }, 200);
    return () => clearInterval(interval);
  });

  const handlePlayVideo = async () => {
    if (!content.original || !sellectedRoom()) {
      alert("オリジナルビデオが利用できません");
      return;
    }
    setIsLoading(true);
    try {
      const originalVideo = await getMessage({
        messageid: content.original,
        //@ts-expect-error
        roomId: sellectedRoom()!.roomid,
        //@ts-expect-error
        type: sellectedRoom()!.type,
        senderId: senderName,
      });
      const videoValue = JSON.parse(originalVideo.value.content);
      const videoDataURI =
        `data:${videoValue.metadata.mimeType};base64,${videoValue.uri}`;
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

  return (
    <div
      class="media-container inline-block"
      style={{ "max-width": "100%", margin: "4px 0" }}
    >
      <div style={{ position: "relative", display: "inline-block" }}>
        <img
          src={`data:${contentValue.thumbnailMimeType};base64,${contentValue.thumbnailUri}`}
          alt="video thumbnail"
          class="rounded cursor-pointer"
          style={{
            width: aspectRatio() < 0.7 ? "auto" : "100%",
            height: aspectRatio() < 0.7 ? "220px" : "auto",
            "max-width": "250px",
            "max-height": "220px",
            "object-fit": "contain",
          }}
          onLoad={onThumbnailLoad}
        />
        <button
          onClick={handlePlayVideo}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            "font-size": "2rem",
            background: "rgba(0,0,0,0.5)",
            color: "white",
            border: "none",
            "border-radius": "50%",
            width: "60px",
            height: "60px",
            cursor: "pointer",
          }}
          disabled={isLoading()}
        >
          <span style={{ "margin-left": "3px" }}>▶</span>
        </button>
      </div>
    </div>
  );
};

export const DirectVideoPlayer = ({
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
  const [aspectRatio, setAspectRatio] = createSignal(0);

  const onVideoMetadataLoaded = (e: Event) => {
    const video = e.target as HTMLVideoElement;
    setAspectRatio(video.videoWidth / video.videoHeight);
  };

  const handlePlayVideo = () => {
    setVideoPlayer({
      isOpen: true,
      videoUrl,
      videoType,
    });
  };

  return (
    <div
      class="media-container inline-block"
      style={{ "max-width": "100%", margin: "4px 0" }}
    >
      <div
        style={{
          position: "relative",
          display: "inline-block",
          "border-radius": "8px",
          overflow: "hidden",
        }}
      >
        <video
          class="video-preview"
          style={{
            width: aspectRatio() < 0.7 ? "auto" : "100%",
            height: aspectRatio() < 0.7 ? "220px" : "auto",
            "max-width": "250px",
            "max-height": "220px",
            "object-fit": "contain",
          }}
          onClick={handlePlayVideo}
          onLoadedMetadata={onVideoMetadataLoaded}
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
            "justify-content": "center",
          }}
        >
          <span style={{ "margin-left": "3px" }}>▶</span>
        </button>
      </div>
      <div
        style={{
          padding: "8px",
          "font-size": "0.9rem",
          display: "flex",
          "justify-content": "space-between",
          "align-items": "center",
          "max-width": "250px",
        }}
      >
        <div
          style={{
            overflow: "hidden",
            "text-overflow": "ellipsis",
            "white-space": "nowrap",
            "max-width": "170px",
          }}
        >
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
            cursor: "pointer",
          }}
        >
          再生
        </button>
      </div>
    </div>
  );
};

export function VideoPlayer() {
  const [videoPlayer, setVideoPlayer] = useAtom(videoPlayerState);
  const closePlayer = () => {
    setVideoPlayer({ isOpen: false, videoUrl: null, videoType: null });
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
            <video controls autoplay class="max-w-full max-h-[80vh]">
              <source
                src={videoPlayer().videoUrl!}
                type={videoPlayer().videoType!}
              />
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
