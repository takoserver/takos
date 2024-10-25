export function Home() {
  return (
    <>
      <div class="flex items-center justify-between p-4">
        <div class="text-xs">
        </div>
        <div class="flex items-center space-x-4">
          <span class="material-icons">X</span>
          <span class="material-icons">X</span>
          <span class="material-icons">X</span>
        </div>
      </div>

      <div class="p-4">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 rounded-full flex items-center justify-center">
            <img
              src="/api/v2/client/users/icon"
              alt="Profile"
              class="rounded-full"
            />
          </div>
          <div>
            <h1 class="text-2xl font-bold">たこ</h1>
            <p class="text-sm">I'm full stack engineer</p>
            <p class="text-sm text-green-400">tako@localhost:8000</p>
          </div>
        </div>
      </div>

      <div class="p-4">
        <div class="mb-4">
          <input
            type="text"
            placeholder="検索"
            class="w-full p-2 bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <h2 class="text-xl font-bold mb-2">友だちリスト</h2>
          <div class="space-y-2">
            <div class="flex items-center space-x-2">
              <img
                src="https://via.placeholder.com/50"
                alt="kuma"
                class="w-10 h-10 rounded-full"
              />
              <div>
                <p class="text-sm">誕生日が近い友だち</p>
                <p class="text-xs text-gray-400">kuma</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <img
                src="https://via.placeholder.com/50"
                alt=""
                class="w-10 h-10 rounded-full"
              />
              <div>
                <p class="text-sm">お気に入り</p>
                <p class="text-xs text-gray-400">いか</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <img
                src="https://via.placeholder.com/50"
                alt=""
                class="w-10 h-10 rounded-full"
              />
              <div>
                <p class="text-sm">友だち</p>
                <p class="text-xs text-gray-400">たこ、かに、魚</p>
              </div>
            </div>
            <div class="flex items-center space-x-2">
              <img
                src="https://via.placeholder.com/50"
                alt="グループ"
                class="w-10 h-10 rounded-full"
              />
              <div>
                <p class="text-sm">グループ</p>
                <p class="text-xs text-gray-400">魚介類同好会</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
