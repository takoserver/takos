import { createEffect } from "solid-js";
import { useAtom } from "solid-jotai";
import {
  selectedFriendTabState,
  selectedTabState,
} from "../../utils/settingRoomState";
import { FriendSettingMenu } from "./FriendSettingMenu";
import { FriendSettingChat } from "./FriendSettingChat";
import { FriendSettingNotifications } from "./FriendSettingNotifications";

export function FriendSetting() {
  const [_, setSelectedTab] = useAtom(selectedTabState);

  // コンポーネントのマウント時に、グループの選択状態をリセット
  createEffect(() => {
    setSelectedTab(false);
  });

  return (
    <>
      <FriendSettingMenu />
      <FriendSettingChat />
      <FriendSettingNotifications />
      {/* 今後、他の設定画面コンポーネントを追加する場合はここに追加してください */}
    </>
  );
}
