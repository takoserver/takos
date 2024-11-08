import {
  PopUpFrame,
  PopUpInput,
  PopUpLabel,
  PopUpTitle,
} from "../components/popUpFrame";
import { Accessor, createSignal } from "solid-js";
import { checkEmail } from "../../../takos/utils/checkEmail";
import { requester } from "../utils/requester";
import { checkPassword, checkUserName } from "../../../takos/utils/checks";
export function Register(
  { domain, recapchav3, recapchav2siteKey }: {
    domain: string;
    recapchav3: Accessor<string>;
    recapchav2siteKey: Accessor<string>;
  },
) {
  const [open, setOpen] = createSignal(false);
  const [page, setPage] = createSignal(0);
  const [email, setEmail] = createSignal("");
  const [sessionid, setSessionid] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [isFailedRecapcha, setIsFailedRecapcha] = createSignal(false);
  const [checkCode, setCheckCode] = createSignal("");
  const [userName, setUserName] = createSignal("");
  return (
    <>
      <button
        class="bg-[#00acee] text-white rounded-3xl py-2 px-4 hover:bg-[#00a0e9] w-full"
        onClick={() => {
          setOpen(true);
        }}
      >
        このサーバーに登録する
      </button>
      {open() && (
        <PopUpFrame
          closeScript={setOpen}
        >
          <PopUpTitle>登録</PopUpTitle>
          {page() === 0 && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSessionid("");
                setPassword("");
                setCheckCode("");
                setIsFailedRecapcha(false);
                if (!checkEmail(email())) {
                  alert("メールアドレスの形式が正しくありません");
                  return;
                }
                if (isFailedRecapcha()) {
                  const form_data = new FormData(e.target as HTMLFormElement);
                  const recapchav2 = form_data.get(
                    "g-recaptcha-response",
                  ) as string;
                  const res = await requester(domain, "tempRegister", {
                    email: email(),
                    recapchaVersion: "v2",
                    recapcha: recapchav2,
                  });
                  if (res.status !== 200) {
                    alert("エラーが発生しました");
                    return;
                  }
                  const json = await res.json();
                  setSessionid(json.sessionid);
                } else {
                  const recapcha = recapchav3();
                  const res = await requester(domain, "tempRegister", {
                    email: email(),
                    recapchaVersion: "v3",
                    recapcha: recapcha,
                  });
                  const json = await res.json();
                  if (res.status !== 200) {
                    if (json.error === "recapcha error") {
                      setIsFailedRecapcha(true);
                    }
                    return;
                  }

                  setSessionid(json.sessionid);
                }
                setPage(1);
              }}
            >
              <PopUpLabel htmlFor="text">email</PopUpLabel>
              <PopUpInput
                type="email"
                placeholder="tako@takos.jp"
                state={setEmail}
              />
              {isFailedRecapcha() && (
                <>
                  <script
                    src="https://www.google.com/recaptcha/api.js"
                    async
                    defer
                  >
                  </script>
                  <script src="./v2.js"></script>
                  <div
                    class="g-recaptcha"
                    data-sitekey={recapchav2siteKey()}
                    data-callback="verifyCallback"
                    data-expired-callback="expiredCallback"
                  >
                  </div>
                </>
              )}
              <div class="flex justify-end">
                <button
                  type="submit"
                  class="rounded-lg mt-3 text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                >
                  {"登録"}
                </button>
              </div>
            </form>
          )}
          {page() === 1 && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const code = checkCode();
                const res = await requester(domain, "checkCode", {
                  sessionid: sessionid(),
                  code: code,
                });
                if (res.status !== 200) {
                  alert("エラーが発生しました");
                  return;
                } else {
                  setPage(2);
                }
              }}
            >
              <PopUpLabel htmlFor="text">
                メールに送信されたコードを入力してください
              </PopUpLabel>
              <PopUpInput
                type="numuer"
                placeholder="123456"
                state={setCheckCode}
              />
              <div class="flex justify-end">
                <button
                  type="submit"
                  class="rounded-lg mt-3 text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                >
                  {"検証"}
                </button>
              </div>
            </form>
          )}
          {page() === 2 && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!checkUserName(userName())) {
                  alert("ユーザー名は半角英数字で入力してください");
                  return;
                }
                if (!checkPassword(password())) {
                  alert("パスワードは半角英数字で入力してください");
                  return;
                }
                const res = await requester(domain, "register", {
                  sessionid: sessionid(),
                  password: password(),
                  userName: userName(),
                });
                if (res.status !== 200) {
                  alert("エラーが発生しました");
                  return;
                }
                alert("登録が完了しました");
                setOpen(false);
              }}
            >
              <PopUpLabel htmlFor="text">userName</PopUpLabel>
              <PopUpInput
                type="text"
                placeholder="tako"
                state={setUserName}
              />
              <PopUpLabel htmlFor="text">password</PopUpLabel>
              <PopUpInput
                type="password"
                placeholder="password"
                state={setPassword}
              />
              <div class="flex justify-end">
                <button
                  type="submit"
                  class="rounded-lg mt-3 text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
                >
                  {"登録"}
                </button>
              </div>
            </form>
          )}
        </PopUpFrame>
      )}
    </>
  );
}
