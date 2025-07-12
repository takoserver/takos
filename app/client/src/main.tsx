/* @refresh reload */
import { render } from "solid-js/web";
import { registerSW } from "virtual:pwa-register";

import App from "./App.tsx";
import { hashIntegration, Router } from "@solidjs/router";

render(
  () => (
    <Router source={hashIntegration()}>
      <App />
    </Router>
  ),
  document.getElementById("root")!,
);
// サービスワーカーを登録してPWAを有効化
registerSW({ immediate: true });
