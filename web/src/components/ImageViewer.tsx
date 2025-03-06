import { atom, useAtom } from "solid-jotai";
import { createSignal } from "solid-js";
import { getMessage } from "../utils/getMessage";
import { selectedRoomState } from "../utils/roomState";

// 画像拡大表示用の状態管理
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
  const [isLoading, setIsLoading] = createSignal(false);
  const sellectedRoom = () => useAtom(selectedRoomState)[0];

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

  const toggleOriginal = async (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (isShowingOriginal()) {
      setIsShowingOriginal(false);
      return;
    }
    const originalMessageId = zoomedImage().original;
    const room = sellectedRoom();
    if (!room) return;
    //@ts-ignore
    const roomId = room.roomid;
    //@ts-ignore
    const type = room.type;
    const senderId = zoomedImage().senderId;
    if (!originalMessageId || !roomId || !type || !senderId) return;

    setIsLoading(true);
    try {
      const originalImage = await getMessage({
        messageid: originalMessageId,
        roomId,
        type,
        senderId,
      });
      const imageValue = JSON.parse(originalImage.value.content);
      setZoomedImage({
        ...zoomedImage(),
        imageUrl:
          `data:${imageValue.metadata.mimeType};base64,${imageValue.uri}`,
      });
      setIsShowingOriginal(true);
    } catch (error) {
      console.error("オリジナル画像の読み込みに失敗しました:", error);
    } finally {
      setIsLoading(false);
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
                disabled={isLoading()}
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

export function ImageCompornent({
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
    setZoomedImage({ isOpen: true, original, imageUrl: src, senderId });
  };

  return (
    <div
      class="media-container inline-block"
      style={{ "max-width": "100%", margin: "4px 0" }}
    >
      <img
        src={src}
        alt="送信された画像"
        class="rounded cursor-pointer"
        style={{
          width: "100%",
          height: "auto",
          "max-width": "250px",
          "max-height": "300px",
          "object-fit": "contain",
        }}
        onClick={handleImageClick}
      />
    </div>
  );
}
