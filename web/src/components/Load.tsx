import { loadState, loginState } from "../utils/state";
export function Loading() {
  return (
    <>
      <div class="w-full h-screen fixed z-[99999999999] flex bg-[#181818]">
          <div class="text-4xl text-center m-auto text-white">Loading...</div>
      </div>
    </>
  );
}

export function Load() {
  const sessionid = localStorage.getItem("sessionid");
  const serverDomain = localStorage.getItem("serverDomain");
  if(sessionid && serverDomain) {
    // 後で書く
    return <></>
  }
  
  return <></>
}