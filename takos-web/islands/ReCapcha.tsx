import { useEffect, useState } from "preact/hooks";
function ReCapcha(
  { state}: { state: any },
) {
  const [sitekeyv3, setsitekeyv3] = useState("");
  useEffect(() => {
    (async function loadRecapcha() {
      const sitekeyv3 = await fetch("/takos/v2/client/recaptcha").then((res) => res.json()).then((res) => res.v3);
      setsitekeyv3(sitekeyv3);
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?render=" + sitekeyv3;
      script.async = true;
      script.onload = () => {
        state.RecapchaLoaded.value = true;
      };
      document.body.appendChild(script);
    })();
  }, []);
  useEffect(() => {
    console.log("aaa");
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(sitekeyv3, { action: "homepage" }).then(
          (token) => {
            state.recapchav3.value = token;
          },
        );
      });
  }, [state.RecapchaLoaded.value, sitekeyv3]);
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
