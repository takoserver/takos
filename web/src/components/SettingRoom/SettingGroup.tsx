import { createEffect } from "solid-js";
import { useAtom } from "solid-jotai";
import { selectedFriendTabState } from "../../utils/settingRoomState";
import { GroupSettingMenu } from "./GroupSettingMenu.tsx";
import { GroupSettingDetail } from "./GroupSettingDetail.tsx";
import { GroupSettingInvite } from "./GroupSettingInvite.tsx";
import { GroupSettingLeave } from "./GroupSettingLeave.tsx";
import { GroupSettingRole } from "./GroupSettingRole.tsx";
import { GroupSettingMember } from "./GroupSettingMember.tsx";
import { GroupSettingBan } from "./GroupSettingBan.tsx";
import { GroupSettingRequest } from "./GroupSettingRequest.tsx";

export const availablePermissions = [
  `ADMIN`,
  "MANAGE_CHANNEL",
  `MANAGE_USER`,
  `INVITE_USER`,
  `MANAGE_SERVER`,
  `VIEW_LOG`,
];

export function GroupSetting() {
  const [_, setSelectedFriendTab] = useAtom(selectedFriendTabState);

  // コンポーネントのマウント時に、フレンドの選択状態をリセット
  createEffect(() => {
    setSelectedFriendTab(false);
  });

  return (
    <>
      <GroupSettingMenu />
      <GroupSettingDetail />
      <GroupSettingInvite />
      <GroupSettingLeave />
      <GroupSettingRole />
      <GroupSettingMember />
      <GroupSettingRequest />
      <GroupSettingBan />
    </>
  );
}
