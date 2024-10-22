/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { Router } from "@solidjs/router";

const root = document.getElementById("root");

const routes = [
  {
    path: "/",
    component: () => <App />,
  },
  {
    path: "/login",
    component: () => <App />,
  },
  {
    path: "/test",
    component: () => <div>Test</div>,
  },
];

render(() => <Router>{routes}</Router>, root!);
