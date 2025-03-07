import { createSignal, For, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { atom } from "solid-jotai";

// モーダル表示状態を管理するグローバルステート
export const showEncryptionSettingsState = atom(false);

interface EncryptionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEncrypted: boolean;
  onToggleEncryption: () => void;
  excludedUsers?: string[];
  onUpdateExcludedUsers?: (users: string[]) => void;
}

export function EncryptionSettingsModal(props: EncryptionSettingsModalProps) {
  // 内部の暗号化設定状態
  const [localIsEncrypted, setLocalIsEncrypted] = createSignal(
    props.isEncrypted,
  );
  // 除外ユーザーリスト
  const [localExcludedUsers, setLocalExcludedUsers] = createSignal(
    props.excludedUsers || [],
  );
  // 新規ユーザー入力用
  const [newUser, setNewUser] = createSignal("");

  // 除外ユーザーを追加
  const addExcludedUser = () => {
    const user = newUser().trim();
    if (user && !localExcludedUsers().includes(user)) {
      setLocalExcludedUsers([...localExcludedUsers(), user]);
      setNewUser("");
    }
  };

  // 除外ユーザーを削除
  const removeExcludedUser = (user: string) => {
    setLocalExcludedUsers(localExcludedUsers().filter((u) => u !== user));
  };

  // 設定を保存
  const saveSettings = () => {
    if (localIsEncrypted() !== props.isEncrypted) {
      props.onToggleEncryption();
    }

    // 除外ユーザーリストを更新
    if (props.onUpdateExcludedUsers) {
      props.onUpdateExcludedUsers(localExcludedUsers());
    }

    props.onClose();
  };

  // キャンセル処理
  const cancelSettings = () => {
    setLocalIsEncrypted(props.isEncrypted);
    setLocalExcludedUsers(props.excludedUsers || []);
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div
            class="bg-[#333333] rounded-lg w-full max-w-md p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold">暗号化設定</h2>
              <button
                class="text-gray-400 hover:text-white"
                onClick={props.onClose}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div class="mb-6">
              <div class="flex items-center justify-between py-3">
                <span class="text-gray-200">メッセージの暗号化</span>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    class="sr-only peer"
                    checked={localIsEncrypted()}
                    onChange={() => setLocalIsEncrypted(!localIsEncrypted())}
                  />
                  <div class="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600">
                  </div>
                </label>
              </div>

              <Show when={localIsEncrypted()}>
                <div class="mt-4 text-sm text-gray-400">
                  <p>
                    暗号化を有効にすると、メッセージはエンドツーエンドで暗号化されます。
                  </p>
                  <p class="mt-2">
                    チャット参加者のみがメッセージを閲覧できます。
                  </p>

                  <div class="mt-4 border-t border-gray-700 pt-4">
                    <h3 class="font-medium text-gray-200 mb-2">
                      暗号化から除外するユーザー
                    </h3>
                    <p class="mb-2">
                      指定したユーザーに対しては暗号化されず、解読できません。
                    </p>

                    <div class="flex items-center mt-3">
                      <input
                        type="text"
                        class="flex-grow bg-gray-800 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="ユーザー名を入力"
                        value={newUser()}
                        onInput={(e) => setNewUser(e.currentTarget.value)}
                        onKeyPress={(e) =>
                          e.key === "Enter" && addExcludedUser()}
                      />
                      <button
                        class="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
                        onClick={addExcludedUser}
                      >
                        追加
                      </button>
                    </div>

                    <div class="mt-3">
                      <Show when={localExcludedUsers().length > 0}>
                        <ul class="space-y-1">
                          <For each={localExcludedUsers()}>
                            {(user) => (
                              <li class="flex justify-between items-center bg-gray-800 rounded px-3 py-2">
                                <span>{user}</span>
                                <button
                                  class="text-red-400 hover:text-red-300"
                                  onClick={() => removeExcludedUser(user)}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </button>
                              </li>
                            )}
                          </For>
                        </ul>
                      </Show>
                      <Show when={localExcludedUsers().length === 0}>
                        <p class="text-gray-500 italic">
                          除外するユーザーがいません
                        </p>
                      </Show>
                    </div>
                  </div>
                </div>
              </Show>
              <Show when={!localIsEncrypted()}>
                <div class="mt-4 text-sm text-orange-400">
                  <p>
                    警告:
                    暗号化を無効にすると、メッセージは暗号化されずに送信されます。
                  </p>
                  <p class="mt-2">
                    サーバー管理者や中間者がメッセージの内容を閲覧できる可能性があります。
                  </p>
                </div>
              </Show>
            </div>

            <div class="flex justify-end space-x-3">
              <button
                class="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
                onClick={cancelSettings}
              >
                キャンセル
              </button>
              <button
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                onClick={saveSettings}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}

export default EncryptionSettingsModal;
