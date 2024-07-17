// Cache the elements outside the function if they are used multiple times throughout the app
let headerElement: HTMLElement | null;
let chatmainElement: HTMLElement | null;
let chatHeaderElement: HTMLElement | null;

export const setIschoiseUser = (ischoiseUser: boolean, obj: any) => {
  if (!headerElement || !chatmainElement || !chatHeaderElement) {
    headerElement = document.getElementById("header");
    chatmainElement = document.getElementById("chatmain");
    chatHeaderElement = document.getElementById("chatHeader");
  }
  if (ischoiseUser) {
    headerElement?.classList.add("is-inview");
    chatmainElement?.classList.add("is-inview");
    chatHeaderElement?.classList.remove("hidden");
  } else {
    headerElement?.classList.remove("is-inview");
    chatmainElement?.classList.remove("is-inview");
    chatHeaderElement?.classList.add("hidden");
  }
  // Only update obj.value if necessary
  if (obj.value !== ischoiseUser) {
    obj.value = ischoiseUser;
  }
};
export function checkEmail(email: string) {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(email);
}
export function splitUserName(userName: string) {
  const split = userName.split("@");
  return {
    userName: split[0],
    domain: split[1],
  };
}
