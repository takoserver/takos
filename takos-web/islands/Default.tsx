import { useEffect } from "preact/hooks";
import { AppStateType } from "../util/types.ts";
import { setIschoiseUser } from "../util/takosClient.ts";
export default function setDefaultState({ state }: { state: AppStateType }) {
  useEffect(() => {
    //loginしているか、していたら基本情報を取得
    async function setDefaultState() {
      const userInfoData = await fetch("/takos/v2/client/profile").then((res) =>
        res.json()
      );
      if (!userInfoData.status) {
        window.location.href = "/";
      }
      state.userName.value = userInfoData.userName;

      const request = indexedDB.open("takos", 1);
      /*
      const request = indexedDB.open("takos", 1);

      request.onupgradeneeded = function(event){
        //onupgradeneededは、DBのバージョン更新(DBの新規作成も含む)時のみ実行
          const db = (event.target as IDBOpenDBRequest)?.result;
          const objectSotre = db.createObjectStore("keies", {keyPath : "id"});
          objectSotre.createIndex("keyName", "keyName", {unique: true});
          objectSotre.createIndex("value", "value", {unique: false});
      }
        request.onsuccess = function(event){
        //onupgradeneededの後に実行。更新がない場合はこれだけ実行
          console.log('db open success');
        }
        request.onerror = function(event){
        // 接続に失敗
          console.log('db open error');
        }
        */
    }
    setDefaultState();
  }, []);
  useEffect(() => {
    async function setDefaultState() {
      const friendListData = await fetch("/api/v2/client/friends/list");
      const friendListJson = await friendListData.json();
      state.friendList.value = friendListJson.friends;
    }
    setDefaultState();
  }, []);
  useEffect(() => {
    if (
      state.inputMessage.value && !/^[\n]+$/.test(state.inputMessage.value) &&
      state.inputMessage.value.length <= 100
    ) {
      state.isValidInput.value = true;
    } else {
      state.isValidInput.value = false;
    }
  }, [state.inputMessage.value]);
  useEffect(() => {
    state.ws.value = new WebSocket("/api/v2/client/main");
    state.ws.value.onopen = () => {
      console.log("connected");
    };
    state.ws.value.onmessage = (event: any) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case "connected":
          state.sessionid.value = data.sessionid;
          if (state.friendid.value) {
            state.ws.value?.send(JSON.stringify({
              type: "joinFriend",
              sessionid: state.sessionid.value,
              friendid: state.friendid.value,
            }));
          }
          break;
        case "joined":
          {
            if (data.roomType === "friend") {
              state.roomType.value = "friend";
              const roomInfo = state.friendList.value.find((room: any) =>
                room.userName === data.friendid
              );
              state.roomid.value = "";
              state.friendid.value = data.friendid;
              state.roomName.value = roomInfo.nickName;
              setIschoiseUser(true, state.isChoiceUser);
              window.history.pushState(
                "",
                "",
                "/talk/friends/" + state.friendid.value,
              );
              const talkData = fetch(
                "/api/v2/client/talks/friend/data?friendid=" +
                  state.friendid.value + "&limit=50",
              );
              talkData.then((res) => res.json()).then((res) => {
                const data = res.data as any[];
                //timestamp順にソート
                data.sort((a, b) => {
                  return new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime();
                });
                state.talkData.value = data;
              });
            }
          }
          break;
        case "text": {
          console.log(data);
          const message = {
            messageid: data.messageid,
            type: "text",
            message: data.message,
            userName: data.userName,
            timestamp: data.time,
            read: [],
          };
          const result = state.talkData.value.concat(message);
          result.sort((a, b) => {
            return new Date(a.timestamp).getTime() -
              new Date(b.timestamp).getTime();
          });
          state.talkData.value = result;
          break;
        }
      }
    };
  }, []);
  return <></>;
}
