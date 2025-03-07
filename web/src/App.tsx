import { loadState, loginState, pageState } from "./utils/state.ts";
import { useAtom } from "solid-jotai";
import { Load, Loading } from "./components/load.tsx";
import { Css } from "./components/Css.tsx";
import "./App.css";
import { ChangeURL } from "./components/ChangeURL.tsx";
import { Register } from "./register/index.tsx";
import { Chat } from "./components/Chat.tsx";
import { createEffect, createSignal } from "solid-js";
import {
  CreateIdentityKeyPopUp,
  CreateShareSignKeyPopUp,
} from "./components/CreateIdentityKeyPopUp.tsx";
import { CreateGroupPopUp } from "./components/CreateGroup.tsx";
import { MigrateKey } from "./components/MigrateKeys.tsx";
import {
  contextMenuPositionState,
  showEditChannelModalState,
} from "./components/ChatTalkContent.tsx";
import { ImageViewer } from "./components/ImageViewer.tsx";
import { VideoPlayer } from "./components/VideoPlayer.tsx";
import { ChannelEditModal } from "./components/ChannelEditModal.tsx";
import { CreateChannelModal } from "./components/CreateChannelModal.tsx";

function App(
  { page }: { page?: "home" | "talk" | "friend" | "setting" | "notification" },
) {
  const [load] = useAtom(loadState);
  const [login] = useAtom(loginState);
  const [_page, setPageState] = useAtom(pageState);
  const [contextMenuPosition, setContextMenuPosition] = useAtom(
    contextMenuPositionState,
  );
  const [showEditChannelModal, setShowEditChannelModal] = useAtom(
    showEditChannelModalState,
  );
  const [isMobile] = createSignal(window.innerWidth <= 768);

  setPageState(page || "talk");
  createEffect(() => {
    console.log(load(), login());
  });
  return (
    <>
      <CreateChannelModal />
      {!load() && <Loading />}
      <CreateIdentityKeyPopUp />
      <CreateShareSignKeyPopUp />
      <CreateGroupPopUp />
      <Css />
      <ChangeURL />
      <Load />
      <MigrateKey />
      {load() && login() && <Chat />}
      {load() && !login() && <Register />}
      {showEditChannelModal() && (
        <ChannelEditModal
          channel={contextMenuPosition().id}
          type={contextMenuPosition().type!}
          onClose={setShowEditChannelModal}
        />
      )}
      <ImageViewer />
      <VideoPlayer />
    </>
  );
}

export default App;
