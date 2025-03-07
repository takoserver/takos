/* @refresh reload */
import { render } from "solid-js/web";
import App from "./App";
import { Router } from "@solidjs/router";
import "./styles/loading.css";

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
    path: "/home",
    component: () => <App page="home" />,
  },
  {
    path: "/home/:roomId",
    component: () => <App page="home" />,
  },
  {
    path: "/talk",
    component: () => <App page="talk" />,
  },
  {
    path: "/talk/:roomId",
    component: () => <App page="talk" />,
  },
  {
    path: "/friend",
    component: () => <App page="friend" />,
  },
  {
    path: "/friend/:roomId",
    component: () => <App page="friend" />,
  },
  {
    path: "/notification",
    component: () => <App page="notification" />,
  },
  {
    path: "/notification/:roomId",
    component: () => <App page="notification" />,
  },
];

render(() => <Router>{routes}</Router>, root!);
