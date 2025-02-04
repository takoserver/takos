import { atom, useAtom } from "solid-jotai";
import { createSignal } from "solid-js";
import { arrayBufferToBase64, base64ToArrayBuffer } from "../utils/buffers";

export const shoowGroupPopUp = atom(false);

export function CreateGroupPopUp() {
  const [showGroupPopUp, setShowGroupPopUp] = useAtom(shoowGroupPopUp);
  const [groupName, setGroupName] = createSignal("");
  // groupIcon は画像のBase64文字列または null を保持
  const [groupIcon, setGroupIcon] = createSignal<string | null>(null);

  async function handleSaveGroup() {
    const name = groupName();
    const icon = arrayBufferToBase64(base64ToArrayBuffer(groupIcon()!))
    if (!name) {
      alert("グループ名を入力してください");
      return;
    }
    if(!icon) {
        alert("アイコンを設定してください");
        return;
    }
    const res = await fetch("/api/v2/group/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: name,
            icon: icon,
        }),
    });
    if (res.status !== 200) {
        alert("グループ作成に失敗しました");
        return;
    }
    alert("グループを作成しました");
    setShowGroupPopUp(false);
  }

  return (
    <>
      {showGroupPopUp() && (
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)] p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div class="bg-[#242424] rounded-lg shadow-2xl w-full max-w-md">
            {/* ヘッダー */}
            <div class="flex items-center justify-between border-b border-gray-700 px-5 py-3">
              <h2 class="text-xl font-semibold text-white">グループ設定</h2>
              <button
                onClick={() => setShowGroupPopUp(false)}
                aria-label="閉じる"
                class="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                &times;
              </button>
            </div>
            {/* 設定コンテンツ */}
            <div class="p-6 space-y-6">
              {/* アイコン設定 + グループ名 */}
              <div class="flex flex-col items-center space-y-4">
                {/* アイコン表示部分（クリックで画像選択） */}
                <label for="groupIcon" class="cursor-pointer">
                  {groupIcon() ? (
                    <img
                      src={groupIcon()!}
                      alt="グループアイコン"
                      class="w-24 h-24 rounded-full object-cover border-2 border-gray-600"
                    />
                  ) : (
                    <div class="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 border-2 border-gray-600">
                      アイコン
                    </div>
                  )}
                </label>
                <input
                  id="groupIcon"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  onChange={(e) => {
                    const file = e.currentTarget.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        console.log(reader.result);
                        setGroupIcon(reader.result as string);
                      }
                      reader.readAsDataURL(file);
                    } else {
                      setGroupIcon(null);
                    }
                  }}
                />
                {/* グループ名入力 */}
                <input
                  type="text"
                  value={groupName()}
                  onInput={(e) => setGroupName(e.currentTarget.value)}
                  placeholder="グループ名を入力"
                  class="w-full px-4 py-2 rounded border border-gray-600 bg-gray-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                />
              </div>
              {/* 保存ボタン */}
              <div class="flex justify-end">
                <button
                  onClick={handleSaveGroup}
                  class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  保存する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
