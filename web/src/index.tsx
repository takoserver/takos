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
  {
    path: "/home",
    component: () => <App page="home" />,
  },
  {
    path: "/talk",
    component: () => <App page="talk" />,
  },
  {
    path: "/friend",
    component: () => <App page="friend" />,
  },
  {
    path: "/setting",
    component: () => <App page="setting" />,
  },
];

render(() => <Router>{routes}</Router>, root!);
