import { AppStateType } from "../util/types.ts";
export default function ChatTalkTitleContent(props: { state: AppStateType }) {
  return <p>{props.state.roomName.value}</p>;
}
