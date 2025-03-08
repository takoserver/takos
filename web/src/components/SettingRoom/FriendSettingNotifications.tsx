import { useAtom } from "solid-jotai";
import { selectedFriendTabState } from "../../utils/settingRoomState";

export function FriendSettingNotifications() {
  const [selected, setSelected] = useAtom(selectedFriendTabState);

  return (
    <>
      {selected() === "notifications" && (
        <div class="p-4">
          <div class="flex items-center mb-4">
            <button
              class="text-white hover:text-gray-300 mr-2"
              onClick={() => setSelected(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <h2 class="text-lg font-medium text-white">通知設定</h2>
          </div>

          <div class="space-y-4">
            <div class="bg-gray-800 rounded-lg p-4">
              <h3 class="text-white text-md font-medium mb-2">通知音</h3>
              <div class="flex items-center">
                <input
                  type="checkbox"
                  id="notification-sound"
                  class="mr-3"
                  checked
                />
                <label for="notification-sound" class="text-white">
                  通知音を有効にする
                </label>
              </div>
            </div>

            <div class="bg-gray-800 rounded-lg p-4">
              <h3 class="text-white text-md font-medium mb-2">
                通知の表示方法
              </h3>
              <select class="w-full bg-gray-700 text-white rounded p-2 border border-gray-600">
                <option value="all">すべての通知を表示</option>
                <option value="mentions">@メンション時のみ表示</option>
                <option value="none">通知を表示しない</option>
              </select>
            </div>

            <div class="bg-gray-800 rounded-lg p-4">
              <h3 class="text-white text-md font-medium mb-2">
                フォーカス設定
              </h3>
              <div class="flex items-center mb-2">
                <input type="checkbox" id="focus-mute" class="mr-3" />
                <label for="focus-mute" class="text-white">
                  フォーカスモード中は通知を無効にする
                </label>
              </div>
              <p class="text-gray-400 text-sm">
                アプリに集中しているときは通知を表示しません
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
