import { useEffect } from "preact/hooks";
function ReCapcha({ state, sitekeyv3, sitekeyv2 }: { state: any; sitekeyv3: string; sitekeyv2: string }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?render=" + sitekeyv3;
    script.async = true;
    script.onload = () => {
      state.RecapchaLoaded.value = true;
    };
    document.body.appendChild(script);
  }, [sitekeyv3]);
  useEffect(() => {
    if (state.RecapchaLoaded.value) {
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(sitekeyv3, { action: "homepage" }).then(
          (token) => {
            state.recapchav3.value = token;
          },
        );
      });
    }
  }, [state.RecapchaLoaded.value, sitekeyv3, state.recapchav3.value]);
  return <></>;
}

export default ReCapcha;
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
