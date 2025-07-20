import { Match, onMount, Switch } from "solid-js";
import { useAtom } from "solid-jotai";
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import VerifyPage from "./pages/VerifyPage.tsx";
import UserPage from "./pages/UserPage.tsx";
import WelcomePage from "./pages/WelcomePage.tsx";
import TermsPage from "./pages/TermsPage.tsx";
import { fetchInstances, fetchStatus } from "./api.ts";
import {
  instancesState,
  loggedInState,
  pathState,
  recaptchaV2SiteKeyState,
  recaptchaV3SiteKeyState,
  rootDomainState,
  termsRequiredState,
} from "./state.ts";
import "./index.css";

export default function App() {
  const [path, setPath] = useAtom(pathState);
  const [loggedIn, setLoggedIn] = useAtom(loggedInState);
  const [, setInstances] = useAtom(instancesState);
  const [, setRootDomain] = useAtom(rootDomainState);
  const [, setTermsRequired] = useAtom(termsRequiredState);
  const [, setRecaptchaV3] = useAtom(recaptchaV3SiteKeyState);
  const [, setRecaptchaV2] = useAtom(recaptchaV2SiteKeyState);

  globalThis.addEventListener("popstate", () => {
    setPath(globalThis.location.pathname.replace(/\/$/, ""));
  });

  const loadStatus = async () => {
    const status = await fetchStatus();
    setLoggedIn(status.login);
    setRootDomain(status.rootDomain ?? "");
    setTermsRequired(status.termsRequired ?? false);
    setRecaptchaV3(status.recaptchaV3SiteKey ?? "");
    setRecaptchaV2(status.recaptchaV2SiteKey ?? "");
  };

  const loadInstances = async () => {
    setInstances(await fetchInstances());
  };

  onMount(async () => {
    await loadStatus();
    if (path() === "/user" && loggedIn()) {
      await loadInstances();
    }
  });

  return (
    <Switch fallback={<WelcomePage />}>
      <Match when={path() === "/auth"}>
        <LoginPage />
      </Match>
      <Match when={path() === "/signup"}>
        <RegisterPage />
      </Match>
      <Match when={path() === "/verify"}>
        <VerifyPage />
      </Match>
      <Match when={path() === "/user"}>
        <UserPage />
      </Match>
      <Match when={path() === "/terms"}>
        <TermsPage />
      </Match>
    </Switch>
  );
}
