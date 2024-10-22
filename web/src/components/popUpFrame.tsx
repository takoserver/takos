import { createSignal, Setter } from "solid-js";
export function PopUpFrame(
  { children, closeScript }: { children: any; closeScript: Setter<boolean> },
) {
  return (
    <div class="fixed z-50 w-full h-full overflow-hidden bg-[rgba(75,92,108,0.4)] left-0 top-0 flex justify-center items-center p-5">
      <div class="bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(24,24,24,0.7)] backdrop-blur border-inherit border-1 max-w-md max-h-[320px] w-full h-full p-5 rounded-xl shadow-lg relative">
        <div class="absolute right-0 top-0 p-4">
          <span
            class="ml-0 text-3xl text-black dark:text-white font-[bold] no-underline cursor-pointer"
            onClick={() => {
              closeScript(false);
            }}
          >
            ×
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PopUpTitle({ children }: { children: string }) {
  return (
    <div class="text-sm">
      <p class="text-black dark:text-white font-bold text-3xl mt-4 mb-5">
        {children}
      </p>
    </div>
  );
}
export function PopUpLabel(
  { children, htmlFor }: { children: string; htmlFor: string },
) {
  return (
    <>
      <label
        for={htmlFor}
        class="block mb-2 text-sm font-medium text-black dark:text-white"
      >
        {children}
      </label>
    </>
  );
}

export function PopUpInput(
  { type, placeholder, state }: {
    type: string;
    placeholder: string;
    state: Setter<string>;
  },
) {
  return (
    <>
      <input
        class="bg-white border border-[rgba(0,0,0,5%)] shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_0_rgba(0,122,255,50%)] focus:shadow-[0_0.5px_1.5px_rgba(0,0,0,30%),0_0_0_3px_rgba(0,122,255,50%)] text-gray-900 text-sm rounded-lg focus:ring-2 ring-1 ring-[rgba(0,0,0,5%)] outline-none block w-full p-2.5"
        onChange={(e) => {
          if (!e.target) {
            return;
          }
          const target = e.target as HTMLInputElement;
          state(target.value);
        }}
        placeholder={placeholder}
        type={type}
      />
    </>
  );
}
