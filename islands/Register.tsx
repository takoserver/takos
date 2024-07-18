import { checkEmail } from "../util/takosClient.ts";
function Register({ state, sitekeyv2, sitekeyv3 }: { state: any; sitekeyv2: string; sitekeyv3: string }) {
  if (state.showWindow.value !== "Register") {
    return (
      <>
        <button
          class="bg-[#00acee] text-white rounded-3xl py-2 px-4 hover:bg-[#00a0e9] w-full"
          onClick={() => {
            state.showWindow.value = "Register";
            state.RegisterPage.value = 0;
          }}
        >
          このサーバーに登録する
        </button>
      </>
    );
  }
  return (
    <>
      <button
        class="bg-[#00acee] text-white rounded-3xl py-2 px-4 hover:bg-[#00a0e9] w-full"
        onClick={() => {
          state.showWindow.value = "Register";
        }}
      >
        このサーバーに登録する
      </button>
      <div class="fixed z-50 w-full h-full overflow-hidden bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-5">
        <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 max-w-md max-h-[320px] w-full h-full p-5 rounded-xl shadow-lg relative">
          <div class="absolute right-0 top-0 p-4">
            <span
              class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
              onClick={() => {
                state.showWindow.value = "";
              }}
            >
              ×
            </span>
          </div>
          {state.RegisterPage.value === 0 && <SendEmailRegisterRequest state={state} sitekeyv2={sitekeyv2} sitekeyv3={sitekeyv3} />}
          {state.RegisterPage.value === 1 && <CheckEmail state={state} sitekeyv2={sitekeyv2} />}
          {state.RegisterPage.value === 2 && <MainRegister state={state} sitekeyv2={sitekeyv2} sitekeyv3={sitekeyv3} />}
          {state.RegisterPage.value === 3 && <TransFarLoginFrom state={state} />}
        </div>
      </div>
    </>
  );
}
function TransFarLoginFrom({ state }: { state: any }) {
  return (
    <>
      <div class="h-full px-2 lg:px-3 flex flex-col">
        <div class="text-sm">
          <p class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
            登録
          </p>
        </div>
        <div class="flex-grow flex flex-col justify-center">
          <div class="m-auto text-white">
            <div class="mb-6">
              登録が完了しましたログインページに移動しますか？
            </div>
            <button
              onClick={() => {
                state.showWindow.value = "login";
              }}
              class="rounded-lg text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
            >
              {"ログイン"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
function MainRegister({ state, sitekeyv2, sitekeyv3 }: { state: any; sitekeyv2: string; sitekeyv3: string }) {
  return (
    <>
      <div class="h-full px-2 lg:px-3 flex flex-col">
        <div class="text-sm">
          <p class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
            登録
          </p>
        </div>
        <form
          class="flex-grow flex flex-col justify-center"
          onSubmit={async (e) => {
            e.preventDefault();
            if (state.checkCode.value === "") {
              alert("トークンを入力してください");
              return;
            }
            let data;
            if (state.recapchav3Failed.value) {
              const form_data = new FormData(e.target as HTMLFormElement);
              const recapchav2 = form_data.get("g-recaptcha-response") as string;
              const res = await fetch("/api/v2/client/sessions/registers/auth", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: state.email.value,
                  password: state.password.value,
                  userName: state.userName.value,
                  token: state.token.value,
                  recaptcha: recapchav2,
                  recaptchakind: "v2",
                }),
              });
              data = await res.json();
            } else {
              const res = await fetch("/api/v2/client/sessions/registers/auth", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: state.email.value,
                  password: state.password.value,
                  userName: state.userName.value,
                  token: state.token.value,
                  recaptcha: state.recapchav3.value,
                  recaptchakind: "v3",
                }),
              });
              data = await res.json();
              if (data.status === false) {
                if (data.message === "rechapchav3") {
                  state.recapchav3Failed.value = true;
                  return;
                }
              }
            }
            if (data.status === true) {
              console.log(data);
              state.RegisterPage.value = 4;
              state.recapchav3Failed.value = false;
              state.recapchav3.value = "";
              state.token.value = "";
              state.email.value = "";
              state.showWindow.value = "login";
              return;
            }
            if (data.status === false) {
              alert(data.message);
            }
          }}
        >
          <label
            for="text"
            class="block mb-2 text-sm font-medium text-black dark:text-white"
          >
            ユーザーネーム
          </label>
          <div class="flex mb-3">
            <input
              onChange={(e) => {
                if (!e.target) {
                  return;
                }
                const target = e.target as HTMLInputElement;
                state.userName.value = target.value;
              }}
              value={state.userName.value}
              type={"text"}
              placeholder={"tako"}
              class="bg-white border border-[rgba(0,0,0,5%)] shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_0_rgba(0,122,255,50%)] focus:shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_3px_rgba(0,122,255,50%)] text-gray-900 text-sm rounded-lg focus:ring-2 ring-1 ring-[rgba(0,0,0,5%)] outline-none block w-full p-2.5"
            />
            <p class="p-2.5 dark:text-white text-black">{"@" + new URL(window.location.href).host}</p>
          </div>
          <label
            for="text"
            class="block mb-2 text-sm font-medium text-black dark:text-white"
          >
            パスワード
          </label>
          <input
            onChange={(e) => {
              if (!e.target) {
                return;
              }
              const target = e.target as HTMLInputElement;
              state.password.value = target.value;
            }}
            value={state.password.value}
            type={"password"}
            placeholder={"xxxxxxx"}
            class="bg-white border border-[rgba(0,0,0,5%)] shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_0_rgba(0,122,255,50%)] focus:shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_3px_rgba(0,122,255,50%)] text-gray-900 text-sm rounded-lg focus:ring-2 ring-1 ring-[rgba(0,0,0,5%)] outline-none block w-full p-2.5"
          />
          {state.recapchav3Failed.value && (
            <>
              <script src="https://www.google.com/recaptcha/api.js" async defer></script>
              <script src="./v2.js"></script>
              <div class="g-recaptcha" data-sitekey={sitekeyv2} data-callback="verifyCallback" data-expired-callback="expiredCallback"></div>
            </>
          )}
          <div class="flex justify-end w-full pt-2 gap-1">
            {state.recapchav3Failed.value && (
              <>
                <div class="w-1/2">
                  <div id="html_element"></div>
                </div>
              </>
            )}
            <button
              type="submit"
              class="rounded-lg text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
            >
              {"登録"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function CheckEmail({ state, sitekeyv2 }: { state: any; sitekeyv2: string }) {
  return (
    <>
      <div class="h-full px-2 lg:px-3 flex flex-col">
        <div class="text-sm">
          <p class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
            確認コード
          </p>
        </div>
        <form
          class="flex-grow flex flex-col justify-center"
          onSubmit={async (e) => {
            e.preventDefault();
            if (state.checkCode.value === "") {
              alert("トークンを入力してください");
              return;
            }
            let data;
            if (state.recapchav3Failed.value) {
              const form_data = new FormData(e.target as HTMLFormElement);
              const recapchav2 = form_data.get("g-recaptcha-response") as string;
              const res = await fetch("/api/v2/client/sessions/registers/check", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: state.email.value,
                  code: state.checkCode.value,
                  token: state.token.value,
                  recaptcha: recapchav2,
                  recaptchakind: "v2",
                }),
              });
              data = await res.json();
            } else {
              const res = await fetch("/api/v2/client/sessions/registers/check", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: state.email.value,
                  code: state.checkCode.value,
                  token: state.token.value,
                  recaptcha: state.recapchav3.value,
                  recaptchakind: "v3",
                }),
              });
              data = await res.json();
              if (data.status === false) {
                if (data.message === "rechapchav3") {
                  state.recapchav3Failed.value = true;
                  return;
                }
              }
            }
            if (data.status === true) {
              console.log(data);
              state.RegisterPage.value = 2;
              state.recapchav3Failed.value = false;
              state.recapchav3.value = "";
              return;
            }
            if (data.status === false) {
              alert(data.message);
            }
          }}
        >
          {/* */}
          <label
            for="text"
            class="block mb-2 text-sm font-medium text-black dark:text-white"
          >
            token
          </label>
          <input
            onChange={(e) => {
              if (!e.target) {
                return;
              }
              const target = e.target as HTMLInputElement;
              state.checkCode.value = target.value;
            }}
            value={state.checkCode.value}
            type={"text"}
            placeholder={"xxxxxxxxxxx"}
            class="bg-white border border-[rgba(0,0,0,5%)] shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_0_rgba(0,122,255,50%)] focus:shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_3px_rgba(0,122,255,50%)] text-gray-900 text-sm rounded-lg focus:ring-2 ring-1 ring-[rgba(0,0,0,5%)] outline-none block w-full p-2.5"
          />
          {state.recapchav3Failed.value && (
            <>
              <script src="https://www.google.com/recaptcha/api.js" async defer></script>
              <script src="./v2.js"></script>
              <div class="g-recaptcha" data-sitekey={sitekeyv2} data-callback="verifyCallback" data-expired-callback="expiredCallback"></div>
            </>
          )}
          <div class="flex justify-end w-full pt-2 gap-1">
            {state.recapchav3Failed.value && (
              <>
                <div class="w-1/2">
                  <div id="html_element"></div>
                </div>
              </>
            )}
            <button
              type="submit"
              class="rounded-lg text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
            >
              {"認証"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
function SendEmailRegisterRequest({ state, sitekeyv2, sitekeyv3 }: { state: any; sitekeyv2: string; sitekeyv3: string }) {
  return (
    <>
      <div class="h-full px-2 lg:px-3 flex flex-col">
        <div class="text-sm">
          <p class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
            登録
          </p>
        </div>
        <form
          class="flex-grow flex flex-col justify-center"
          onSubmit={async (e) => {
            e.preventDefault();
            let data;
            if (state.recapchav3Failed.value) {
              const form_data = new FormData(e.target as HTMLFormElement);
              const recapchav2 = form_data.get("g-recaptcha-response") as string;
              const res = await fetch("/api/v2/client/sessions/registers/temp", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: state.email.value,
                  recaptcha: recapchav2,
                  recaptchakind: "v2",
                }),
              });
              data = await res.json();
            } else {
              const res = await fetch("/api/v2/client/sessions/registers/temp", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: state.email.value,
                  recaptcha: state.recapchav3.value,
                  recaptchakind: "v3",
                }),
              });
              data = await res.json();
              if (data.status === false) {
                if (data.message === "rechapchav3") {
                  state.recapchav3Failed.value = true;
                  return;
                }
              }
            }
            if (data.status === true) {
              state.RegisterPage.value = 1;
              state.recapchav3Failed.value = false;
              state.recapchav3.value = "";
              state.token.value = data.token;
              return;
            }
            if (data.status === false) {
              switch (data.message) {
                case "Invalid email":
                  alert("メールアドレスが無効です");
                  break;
                case "Invalid recaptcha":
                  alert("reCAPTCHAが無効です");
                  break;
                case "rechapchav2":
                  alert("reCAPTCHAが無効です");
                  break;
                case "Already Registered":
                  alert("既に登録されています");
                  break;
                case "rechapchav3":
                  alert("reCAPTCHAが無効です");
                  break;
                default:
                  alert("エラーが発生しました: "+ data.message);
                  break;
              }
            }
          }}
        >
          {/* */}
          <label
            for="email"
            class="block mb-2 text-sm font-medium text-black dark:text-white"
          >
            メールアドレス
          </label>
          <input
            onChange={(e) => {
              if (!e.target) {
                return;
              }
              const target = e.target as HTMLInputElement;
              state.email.value = target.value;
            }}
            value={state.email.value}
            type={"email"}
            placeholder={"tako@takos.jp"}
            class="bg-white border border-[rgba(0,0,0,5%)] shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_0_rgba(0,122,255,50%)] focus:shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_3px_rgba(0,122,255,50%)] text-gray-900 text-sm rounded-lg focus:ring-2 ring-1 ring-[rgba(0,0,0,5%)] outline-none block w-full p-2.5"
          />
          {state.recapchav3Failed.value && (
            <>
              <script src="https://www.google.com/recaptcha/api.js" async defer></script>
              <script src="./v2.js"></script>
              <div class="g-recaptcha" data-sitekey={sitekeyv2} data-callback="verifyCallback" data-expired-callback="expiredCallback"></div>
            </>
          )}
          <div class="flex justify-end w-full pt-2 gap-1">
            {state.recapchav3Failed.value && (
              <>
                <div class="w-1/2">
                  <div id="html_element"></div>
                </div>
              </>
            )}
            <button
              type="submit"
              class="rounded-lg text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
            >
              {"送信"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
export default Register;
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
      render: (element: string, options: { sitekey: string }) => void;
    };
  }
}
