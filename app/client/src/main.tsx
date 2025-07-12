/* @refresh reload */
import { render } from "solid-js/web";
import { registerSW } from "virtual:pwa-register";

import { Router } from "@solidjs/router";
import App from "./App.tsx";

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.getElementById("root")!,
);
// サービスワーカーを登録してPWAを有効化
registerSW({ immediate: true });
