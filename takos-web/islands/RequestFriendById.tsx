import { useEffect, useState } from "preact/hooks";
interface InputProps {
  value: string;
  setValue: (value: string) => void;
  origin: string;
  setShowModal: (value: boolean) => void;
}

export default function RegisterForm(props: any) {
  const [showModal, setShowModal] = useState(false);
  const [value, setValue] = useState("");
  const handleButtonClick = () => {
    setShowModal(!showModal);
  };
  return (
    <>
      <li class="c-talk-rooms">
        <a
          onClick={() => {
            setShowModal(!showModal);
          }}
        >
          <div class="c-talk-rooms-icon">
            <img src="/people.png" alt="" />
          </div>
          <div class="c-talk-rooms-box">
            <div class="c-talk-rooms-name">
              <p>IDで追加</p>
            </div>
            <div class="c-talk-rooms-msg">
              <p></p>
            </div>
          </div>
        </a>
      </li>
      {showModal && (
        <div class="fixed z-50 w-full h-full overflow-hidden bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-5">
          <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 max-w-md max-h-[320px] w-full h-full p-5 rounded-xl shadow-lg relative">
            <div class="absolute right-0 top-0 p-4">
              <span
                class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
                onClick={handleButtonClick}
              >
                ×
              </span>
            </div>
            <div class="h-full px-2 lg:px-3 flex flex-col">
              <div class="text-sm">
                <p class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
                  ユーザーIDで友達追加
                </p>
              </div>
              <div class="flex-grow flex flex-col justify-center">
                <Input
                  value={value}
                  setValue={setValue}
                  origin={props.origin}
                  setShowModal={setShowModal}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function Input({
  value,
  setValue,
  setShowModal,
}: InputProps) {
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSending, setIsSending] = useState(false);

  return (
    <>
      <label
        for="email"
        class="block mb-2 text-sm font-medium text-black dark:text-white"
      >
        ユーザーID
      </label>
      <input
        type={"email"}
        value={value}
        placeholder={"tako@takos.jp"}
        onChange={(e: any) => {
          if (e.target) {
            setValue(e.target.value);
          }
        }}
        class="bg-white border border-[rgba(0,0,0,5%)] shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_0_rgba(0,122,255,50%)] focus:shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_3px_rgba(0,122,255,50%)] text-gray-900 text-sm rounded-lg focus:ring-2 ring-1 ring-[rgba(0,0,0,5%)] outline-none block w-full p-2.5"
      />
      {isError && (
        <p class="text-sm text-red-500">ユーザーが見つかりませんでした</p>
      )}
      {isSuccess && (
        <p class="text-sm text-[#259c5e]">リクエストを送信しました</p>
      )}
      <div class="flex justify-end w-full pt-2 gap-1">
        <button
          onClick={() => setShowModal(false)}
          class="rounded-lg bg-white ring-1 ring-[rgba(24,24,24,5%)] shadow-[0_0.5px_2.5px_rgba(0,0,0,30%)] px-5 py-2 hover:bg-gray-100 dark:bg-[#181818] dark:hover:bg-[#2b2b2b]"
        >
          キャンセル
        </button>
        <button
          onClick={async () => {
            setIsError(false);
            setIsSending(true);
            const csrftokenRes = await fetch(
              `/api/v2/client/csrftoken`,
            );
            const csrftoken = await csrftokenRes.json();
            const result = await fetch("/api/v2/client/friends/request/name", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                csrftoken: csrftoken.csrftoken,
                userName: value,
              }),
            });
            const res = await result.json();
            if (res.status == true) {
              setIsSuccess(true);
              setTimeout(() => setIsSuccess(false), 5000);
              setIsSending(false);
            } else if (result.status === 400) {
              setIsError(true);
              setIsSending(false);
            } else {
              setIsSending(false);
              alert("Error");
            }
          }}
          type="submit"
          disabled={isSending}
          class="rounded-lg text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-1 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
        >
          {isSending ? "送信中" : "送信"}
        </button>
      </div>
    </>
  );
}
