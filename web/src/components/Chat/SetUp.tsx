import { setUpState } from "../../utils/state";
import { useAtom } from "solid-jotai";
import { PopUpFrame } from "./setupPopup/popUpFrame";
import { createEffect, createSignal } from "solid-js";
export function SetUp() {
  const [setUp, setSetUp] = useAtom(setUpState);
  const [isOpen, setIsOpen] = createSignal(false);
  const [setted, setSetted] = createSignal(false);
  createEffect(() => {
    if (!setUp() && !setted()) {
      setIsOpen(true);
      setSetUp(true);
    }
  });
  return (
    <>
      {isOpen() && (
        <>
          <PopUpFrame
            closeScript={setIsOpen}
          >
            <div class="h-full w-full flex">
              <div class="w-1/2 mx-auto">
                <h1 class="text-2xl text-center">セットアップ</h1>
              </div>
            </div>
          </PopUpFrame>
        </>
      )}
    </>
  );
}
