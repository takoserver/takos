import { PopUpFrame, PopUpTitle } from "../components/popUpFrame";
import { createSignal } from "solid-js";
export function Login({ domain }: { domain: string }) {
  const [open, setOpen] = createSignal(false);
  return (
    <>
      <button
        class="bg-[#192320] text-white rounded-3xl py-2 px-4 hover:bg-[#192320] border w-full lg:mt-2 mt-3"
        onClick={() => {
          setOpen(true);
        }}
      >
        ログイン
      </button>
      {open() && (
        <PopUpFrame
          closeScript={setOpen}
        >
          <PopUpTitle>ログイン</PopUpTitle>
        </PopUpFrame>
      )}
    </>
  );
}
