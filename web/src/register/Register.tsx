import {
  PopUpFrame,
  PopUpInput,
  PopUpLabel,
  PopUpTitle,
} from "../components/popUpFrame";
import { createSignal } from "solid-js";
export function Register({ domain }: { domain: string }) {
  const [open, setOpen] = createSignal(false);
  const [page, setPage] = createSignal(0);
  const [email, setEmail] = createSignal("");
  async function tempRegister() {
  }
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
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <PopUpLabel htmlFor="text">email</PopUpLabel>
              <PopUpInput
                type="email"
                placeholder="tako@takos.jp"
                state={setEmail}
              />
              <button
                type="submit"
                onClick={() => {tempRegister()}}
                class="rounded-lg text-white bg-[#007AFF] ring-1 ring-[rgba(0,122,255,12%)] shadow-[0_1px_2.5px_rgba(0,122,255,24%)] px-5 py-2 hover:bg-[#1f7adb] focus:outline-none disabled:bg-gray-300 disabled:dark:bg-gray-700"
              >
                {"登録"}
              </button>
            </form>
          )}
        </PopUpFrame>
      )}
    </>
  );
}
