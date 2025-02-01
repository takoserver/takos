function test() {
  const element = document.getElementById("chat-area");
  if (!element) {
    return;
  }
  //高さ取得
  const scrollHeight = element.scrollHeight;
  const scrollTop = element.scrollTop;
  const isBottom = scrollHeight - scrollTop === element.clientHeight;
  const isTop = scrollTop === 0;
}

export function editScrollAddLatestMessage() {
  const element = document.getElementById("chat-area");
  if (!element) {
    return;
  }
  //高さ取得
  const scrollHeight = element.scrollHeight;
  const scrollTop = element.scrollTop;
  const isBottom = scrollHeight - scrollTop - 300 < element.clientHeight;
  if (isBottom) {
    //一番下までスクロール
    element.scrollTop = element.scrollHeight;
  }
}

export function mostButtom() {
  const element = document.getElementById("chat-area");
  if (!element) {
    return;
  }
  //一番下までスクロール
  element.scrollTop = element.scrollHeight;
}

export function ifTopEventListener(
  callback: () => void,
) {
  const element = document.getElementById("chat-area");
  if (!element) {
    return;
  }
  element.addEventListener("scroll", async () => {
    const scrollTop = element.scrollTop;
    const isTop = scrollTop === 0;
    const state = element.scrollHeight - element.scrollTop;
    if (isTop) {
      await callback();
      const scrollHeight = element.scrollHeight;
      element.scrollTop = scrollHeight - state;
    }
  });
}
