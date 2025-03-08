import { useAtom } from "solid-jotai";
import { selectedFriendTabState } from "../../../utils/room/settingRoomState";
import { createSignal } from "solid-js";

export function FriendSettingMenu() {
  const [selected, setSelected] = useAtom(selectedFriendTabState);
  const [notificationEnabled, setNotificationEnabled] = createSignal(true);

  return (
    <>
      {!selected() && (
        <div class="flex flex-col mt-4">
          {/* 上部アイコンメニュー */}
          <div class="flex justify-around items-center w-full px-4 py-6 mb-2">
            {/* 通知アイコン */}
            <div
              class="flex flex-col items-center hover:scale-105 transition-transform duration-200 cursor-pointer"
              onClick={() => setNotificationEnabled(!notificationEnabled())}
            >
              <div class="relative">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke={notificationEnabled() ? "#3b82f6" : "#6b7280"}
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {!notificationEnabled() && (
                  <div class="absolute inset-0 flex items-center justify-center">
                    <div class="w-0.5 h-10 bg-red-500 transform rotate-45 rounded-full">
                    </div>
                  </div>
                )}
              </div>
              <span class="mt-2 text-sm text-white">
                通知{notificationEnabled() ? "オン" : "オフ"}
              </span>
            </div>

            <div
              class="flex flex-col items-center hover:scale-105 transition-transform duration-200 cursor-pointer"
              onClick={() => setSelected("video")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z"
                />
              </svg>
              <span class="mt-2 text-sm text-white">通話</span>
            </div>

            {/* ブロックアイコン */}
            <div
              class="flex flex-col items-center hover:scale-105 transition-transform duration-200 cursor-pointer"
              onClick={() => setSelected("block")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              <span class="mt-2 text-sm text-white">ブロック</span>
            </div>
          </div>

          {/* メニューセクションのヘッダー */}
          <div class="px-4 py-3 mb-1">
            <h3 class="text-gray-400 text-xs uppercase font-semibold">
              友達設定
            </h3>
          </div>

          {/* オプションセクション - 縦メニュー */}
          <div class="px-4 space-y-1">
            {/* チャット設定 */}
            <div
              class="flex items-center p-3 rounded hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
              onClick={() => setSelected("chat")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span class="text-white">チャット設定</span>
            </div>

            {/* プライバシー */}
            <div
              class="flex items-center p-3 rounded hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
              onClick={() => setSelected("privacy")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span class="text-white">プライバシー</span>
            </div>

            {/* メディア共有 */}
            <div
              class="flex items-center p-3 rounded hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
              onClick={() => setSelected("media")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span class="text-white">共有メディア</span>
            </div>

            {/* 削除 */}
            <div
              class="flex items-center p-3 rounded hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
              onClick={() => setSelected("delete")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6 mr-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style="color: #ff6b6b;"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span class="text-white">削除</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
