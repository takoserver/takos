import { useEffect } from "preact/hooks"
import { AppStateType } from "../util/types.ts"
export default function setDefaultState({ state }: { state: AppStateType }) {
  useEffect(() => {
    async function setDefaultState() {
      const friendListData = await fetch("/api/v2/client/friends/list")
      const friendListJson = await friendListData.json()
      const result = friendListJson.friends.map((friend: any) => {
        return {
          roomName: friend.roomName,
          latestMessage: friend.lastMessage,
          roomID: friend.roomID,
          latestMessageTime: friend.latestMessageTime,
          roomIcon: friend.roomIcon,
          type: friend.type,
          isNewMessage: friend.isNewMessage,
        }
      })
      state.friendList.value = result
      console.log(state.friendList.value)
    }
    setDefaultState()
  }, [])
  return <></>
}
/*
        roomName: friendName?.nickName,
        lastMessage: latestmessage?.message,
        roomID: room.uuid,
        latestMessageTime: latestmessage?.timestamp,
        roomIcon: `/api/v2/friends/info/${friendName?.userName + "@" + env["serverDomain"]}/icon/friend`,
        type: "localfriend",
        isNewMessage: isNewMessage === undefined,
*/