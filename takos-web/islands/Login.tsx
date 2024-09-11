import { checkEmail } from "../util/takosClient.ts"
function Login({ state }: { state: any }) {
  if (state.showWindow.value !== "login") {
    return (
      <>
        <button
          class="bg-[#192320] text-white rounded-3xl py-2 px-4 hover:bg-[#192320] border w-full lg:mt-2 mt-3"
          onClick={() => {
            state.showWindow.value = "login"
            console.log(state.showWindow.value)
          }}
        >
          ログイン
        </button>
      </>
    )
  }
  return (
    <>
      <button
        class="bg-[#192320] text-white rounded-3xl py-2 px-4 hover:bg-[#192320] border w-full lg:mt-2 mt-3"
        onClick={() => {
          state.showWindow.value = "login"
        }}
      >
        ログイン
      </button>
      <div class="fixed z-50 w-full h-full overflow-hidden bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-5">
        <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 max-w-md max-h-[350px] w-full h-full rounded-xl shadow-lg relative p-5">
          <div class="absolute right-0 top-0 p-4">
            <span
              class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
              onClick={() => {
                state.showWindow.value = ""
              }}
            >
              ×
            </span>
          </div>
          <form
            class="h-full px-2 lg:px-3 flex flex-col"
            onSubmit={async (e) => {
              e.preventDefault()
              const isEmail = checkEmail(state.LoginName.value)
              if (isEmail) {
                const res = await fetch("/takos/v2/client/sessions/login", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    email: state.LoginName.value,
                    password: state.LoginPassword.value,
                  }),
                })
                const data = await res.json()
                if (data.status === true) {
                  state.showWindow.value = ""
                  //リダイレクト
                  window.location.href = "/talk"
                } else {
                  alert("ログインに失敗しました")
                }
              } else {
                const res = await fetch("/takos/v2/client/sessions/login", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    userName: state.LoginName.value,
                    password: state.LoginPassword.value,
                  }),
                })
                const data = await res.json()
                if (data.status === true) {
                  state.showWindow.value = ""
                  //リダイレクト
                  window.location.href = "/talk"
                } else {
                  alert("ログインに失敗しました")
                }
              }
            }}
          >
            <div class="text-sm">
              <p class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
                ログイン
              </p>
            </div>
            <div class="flex flex-col">
              <label
                for="email"
                class="block mb-2 text-sm font-medium text-black dark:text-white"
              >
                ユーザーネーム
              </label>
              <div class="w-full mb-2">
                <input
                  class="bg-white border border-[rgba(0,0,0,5%)] shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_0_rgba(0,122,255,50%)] focus:shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_3px_rgba(0,122,255,50%)] text-gray-900 text-sm rounded-lg focus:ring-2 ring-1 ring-[rgba(0,0,0,5%)] outline-none block w-full p-2.5"
                  onChange={(e) => {
                    if (!e.target) {
                      return
                    }
                    const target = e.target as HTMLInputElement
                    state.LoginName.value = target.value
                  }}
                  placeholder={"username"}
                  type={"text"}
                />
              </div>
              <label
                for="email"
                class="block mb-2 text-sm font-medium text-black dark:text-white"
              >
                パスワード
              </label>
              <div class="w-full mb-2">
                <input
                  class="bg-white border border-[rgba(0,0,0,5%)] shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_0_rgba(0,122,255,50%)] focus:shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_3px_rgba(0,122,255,50%)] text-gray-900 text-sm rounded-lg focus:ring-2 ring-1 ring-[rgba(0,0,0,5%)] outline-none block w-full p-2.5"
                  onChange={(e) => {
                    if (!e.target) {
                      return
                    }
                    const target = e.target as HTMLInputElement
                    state.LoginPassword.value = target.value
                  }}
                  placeholder={"password"}
                  type={"password"}
                />
              </div>
            </div>
            <div class="flex justify-end w-full pt-2 gap-1">
              <button
                type="submit"
                class="rounded-lg text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
              >
                {"ログイン"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default Login
