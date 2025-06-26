/* @refresh reload */
import { render } from "solid-js/web";

import App from "./App.tsx";
import { createTakos } from "./takos.ts";

// Initialize the global takos object
declare global {
  interface Window {
    takos: ReturnType<typeof createTakos>;
  }
}

window.takos = createTakos("takos"); // You might want to make the identifier configurable

render(() => <App />, document.getElementById("root")!);
