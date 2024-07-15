import { useSignal } from "@preact/signals";
const createAppState = () => {
  const nickName = useSignal("");
  const age = useSignal("");
  const icon = useSignal("");
};
function setup() {
  return (
    <>
      <div class="h-screen w-full flex">
        <div class="m-auto lg:min-w-[412px]">
          <form
            class="rounded-lg border bg-card text-card-foreground shadow-sm max-w-md lg:min-w-[412px] bg-white mx-2"
            data-v0-t="card"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const nickName = formData.get("nickName") as string;
              const age = formData.get("age") as string;
              const icon = formData.get("icon") as string;
              if (nickName === "" || age === "" || icon === "") {
                alert("全ての項目を入力してください");
                return;
              }
              const ReqFormData = new FormData();
              ReqFormData.append("nickName", nickName);
              ReqFormData.append("age", age);
              ReqFormData.append("icon", icon);
              const res = await fetch("/api/v2/client/sessions/registers/setup", {
                method: "POST",
                body: ReqFormData,
              });
              const result = await res.json();
              if (result.status === true) {
                alert("設定が完了しました");
                window.location.href = "/";
              } else {
                alert("設定に失敗しました");
              }
            }}
          >
            <div class="flex flex-col space-y-1.5 p-6">
              <h3 class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight">アカウント初期設定</h3>
            </div>
            <div class="p-6 space-y-4">
              <div class="space-y-2">
                <label
                  class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  for="username"
                >
                  ニックネーム
                </label>
                <input
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter your nickName"
                  name="nickName"
                />
              </div>
              <div class="space-y-2">
                <label
                  class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  for="email"
                >
                  年齢
                </label>
                <select
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  id="age"
                  name="age"
                >
                  <option value="">年齢を選択してください</option>
                  {Array.from({ length: 120 }, (_, i) => i + 1).map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div class="space-y-2">
                <label
                  class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  for="image"
                >
                  アイコン
                </label>
                <input
                  class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  name="icon"
                  type="file"
                  id="icon"
                />
              </div>
            </div>
            <div class="flex justify-end pt-2 gap-1 w-5/6 mx-auto">
              <button
                type="submit"
                class="rounded-lg text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
              >
                設定
              </button>
            </div>
            <div class="items-center p-6 flex justify-end"></div>
          </form>
        </div>
      </div>
    </>
  );
}

export default setup;
