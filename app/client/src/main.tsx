/* @refresh reload */
import { render } from "solid-js/web";
import { Route, Router, Routes } from "@solidjs/router";
import { registerSW } from "virtual:pwa-register";

import App from "./App.tsx";
import PostView from "./routes/PostView.tsx";
import UserProfilePage from "./routes/UserProfilePage.tsx";

render(
  () => (
    <Router>
      <Routes>
        <Route path="/post/:id" component={PostView} />
        <Route path="/profile/:username" component={UserProfilePage} />
        <Route
          path="/chat/:roomId"
          element={(props) => (
            <App initialPage="chat" initialRoomId={props.params.roomId} />
          )}
        />
        <Route path="/chat" element={() => <App initialPage="chat" />} />
        <Route
          path="/microblog"
          element={() => <App initialPage="microblog" />}
        />
        <Route path="/home" element={() => <App initialPage="home" />} />
        <Route path="/*" component={App} />
      </Routes>
    </Router>
  ),
  document.getElementById("root")!,
);
// サービスワーカーを登録してPWAを有効化
registerSW({ immediate: true });
