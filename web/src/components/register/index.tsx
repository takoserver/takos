import ChatOtherMessage from "../talk/message/OtherMessage.tsx";
import {
  defaultServerState,
  exproleServerState,
  setDefaultServerState,
} from "../../utils/state.ts";
import { createEffect, createSignal } from "solid-js";
import { useAtom } from "solid-jotai";
import { Loading } from "../load.tsx";
import { Register as RegisterComponent } from "./Register.tsx";
import { Login as LoginComponent } from "./Login.tsx";
import { requester } from "../../utils/requester.ts";
const sampleChatData = {
  roomName: "たこたこチャット",
  talkData: [
    {
      userName: "tako",
      messages: { text: "かわよい絵がほしいのぉ", format: "text" },
    },
    {
      userName: "やほほーい",
      messages: { text: "ここ送っていいかな", format: "text" },
    },
    {
      userName: "tako",
      messages: { text: "著作権パワーがあるからなぁ", format: "text" },
    },
    {
      userName: "tako",
      messages: { text: "サイトのど真ん中に置きたい", format: "text" },
    },
    {
      userName: "なん",
      messages: { text: "デザイン考えて、それを元に外注", format: "text" },
    },
    {
      userName: "tako",
      messages: { text: "それが一番だけどえぐい金かかりそう", format: "text" },
    },
    { userName: "tako", messages: { text: "1万ぐらい", format: "text" } },
    { userName: "tako", messages: { text: "もっとかな", format: "text" } },
    {
      userName: "なん",
      messages: {
        text: "もしくは絵が上手い人が知り合いにいればその人に頼む",
        format: "text",
      },
    },
    {
      userName: "なん",
      messages: { text: "1〜4マソが相場らしい", format: "text" },
    },
    {
      userName: "tako",
      messages: { text: "novelAIでしぶるか", format: "text" },
    },
    {
      userName: "tako",
      messages: { text: "それだけあったらモニター買うよ", format: "text" },
    },
    {
      userName: "なん",
      messages: {
        text: "まあ、ネットでうまく関係作るしかないわな",
        format: "text",
      },
    },
    {
      userName: "なん",
      messages: {
        text: "AIだって著作権問題まだまだあるだろうし",
        format: "text",
      },
    },
    {
      userName: "tako",
      messages: { text: "今のところフリーだから", format: "text" },
    },
    {
      userName: "tako",
      messages: { text: "危なくなったらすり替える", format: "text" },
    },
    {
      userName: "tako",
      messages: { text: "まだコイン的なやつ残ってたかな", format: "text" },
    },
    {
      userName: "tako",
      messages: { text: "SSRのchartjsいいね", format: "text" },
    },
    { userName: "tako", img: "./strict/1.jpg" },
    { userName: "371tti", messages: { text: "お", format: "text" } },
    {
      userName: "371tti",
      messages: { text: "ついにchart.jsか", format: "text" },
    },
    { userName: "371tti", img: "./strict/2.jpg" },
    { userName: "371tti", messages: { text: "正規表現😀", format: "text" } },
    {
      userName: "tako",
      messages: {
        text: "右半分は昨日のベスト会話的なの流すか",
        format: "text",
      },
    },
    {
      userName: "tako",
      messages: { text: "もちろん審査あり", format: "text" },
    },
    {
      userName: "tako",
      messages: { text: "きっしょい会話を流すわけにはいかん", format: "text" },
    },
    {
      userName: "tako",
      messages: { text: "公開チャット的なやつだけどね", format: "text" },
    },
    {
      userName: "371tti",
      messages: {
        text: "hello 000 im this OC bot! Nicetomeet you",
        format: "text",
      },
    },
    {
      userName: "371tti",
      messages: { text: "セキュリティむずすぎ", format: "text" },
    },
  ],
};

export function Register() {
  createEffect(() => {
  });
  const [defaultServer, setDefaultServer] = useAtom(defaultServerState);
  const [exproleServer, setExproleServer] = useAtom(exproleServerState);
  const [SetedDefaultServer] = useAtom(setDefaultServerState);
  return (
    <>
      {SetedDefaultServer() && <SelectedServer />}
    </>
  );
}

function SelectedServer() {
  return (
    <>
      <>
        <div class="flex w-full h-screen mb-6">
          <div class="lg:w-2/3 w-full m-5 lg:m-0">
            <div class="bg-white text-black rounded-lg shadow-[0_12px_32px_#00000040] p-6 max-w-[472px] lg:ml-[100px] mt-[80px] mx-auto">
              <div class="flex mb-3">
                <div class="w-full">
                  <div class="flex items-center mb-4">
                    <img
                      src="/api/v2/server/icon"
                      alt="logo"
                      class="w-20 h-20 rounded-lg shadow-md"
                    />
                    <h1 class="text-3xl font-bold ml-4">
                      takos
                    </h1>
                  </div>
                  <div class="text-base text-gray-700 mb-6">
                    explain
                  </div>
                </div>
              </div>
              <RegisterComponent />
              <LoginComponent />
              <button
                onClick={() => {
                  alert("まだ実装してない！！！");
                }}
                class="bg-[#192320] text-white rounded-3xl py-2 px-4 hover:bg-[#192320] border w-full lg:mt-2 mt-3"
              >
                他のサーバーを探す
              </button>
              <div class="flex w-full space-x-4 mt-3">
                <div class="w-1/2 bg-gray-200 text-center py-4 rounded-lg shadow-inner">
                  <p class="text-sm text-gray-700">ユーザー</p>
                  <p class="text-xl font-semibold">{"2(仮)"}</p>
                </div>
                <div class="w-1/2 bg-gray-200 text-center py-4 rounded-lg shadow-inner">
                  <p class="text-sm text-gray-700">
                    接続サーバー
                  </p>
                  <p class="text-xl font-semibold">{"2(仮)"}</p>
                </div>
              </div>
              <div class="w-full bg-gray-200 text-center py-4 rounded-lg shadow-inner mt-3">
                <p class="text-sm text-gray-700">version</p>
                <p class="text-lg font-semibold">
                  {"takos v" + "0.2 beta"}
                </p>
              </div>
            </div>
            <div class="mt-4">
              <div class="bg-white text-black rounded-lg shadow-[0_12px_32px_#00000040] p-6 max-w-[472px] lg:ml-[100px] lg:mt-[20px] mx-auto">
                <img src="/api/v2/client/chart" class="w-full" alt="list" />
              </div>
            </div>
            <div class="mt-4">
              <div class="bg-white text-black rounded-lg shadow-[0_12px_32px_#00000040] p-6 max-w-[472px] lg:ml-[100px] lg:mt-[20px] mx-auto">
                <div class="text-center">
                  <p class="text-sm text-gray-700">
                    © 2024 Tomiyama Shota.
                  </p>
                  <p class="text-base text-gray-600">
                    Operat By takoserver
                  </p>

                  <p class="text-sm text-gray-700">
                    This site is protected by reCAPTCHA and the Google
                    <a href="https://policies.google.com/privacy">
                      Privacy Policy
                    </a>{" "}
                    and
                    <a href="https://policies.google.com/terms">
                      Terms of Service
                    </a>{" "}
                    apply.
                  </p>
                  <div class="flex justify-between w-5/6 mx-auto">
                    <p>
                      <a href="https://www.takos.jp/privacypolicy">
                        プライバシーポリシー
                      </a>
                    </p>
                    <p class="ml-4">
                      <a href="https://www.takos.jp/terms">
                        利用規約
                      </a>
                    </p>
                    <p class="ml-4">
                      <a href="https://x.com/takoserver_com">
                        SNS
                      </a>
                    </p>
                    <p class="ml-4">
                      <a href="https://line.me/ti/g2/Q0c8YJlkh5f_hkDuODxp39XF9A7BOCFqezaAHA?utm_source=invitation&utm_medium=link_copy&utm_campaign=default">
                        コミュニティー
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div class="h-20"></div>
          </div>
          <div class="lg:w-[590px] hidden lg:block top-0 bottom-0 right-0 fixed">
            <div class="w-5/6 m-auto h-full overflow-hidden mx-auto">
              <div class="scroll-animation talkList">
                {sampleChatData.talkData.map((data) => {
                  let iconPath = "";
                  switch (data.userName) {
                    case "tako":
                      iconPath = "/static/tako.jpeg";
                      break;
                    case "371tti":
                      iconPath = "/static/371tti.jpg";
                      break;
                    case "なん":
                      iconPath = "/static/なん.jpeg";
                      break;
                    default:
                      iconPath = "/people.jpeg";
                      break;
                  }
                  if (data.img) {
                    return; //
                  }
                  if (data.messages) {
                    return (
                      <ChatOtherMessage
                        content={{
                          verified: true,
                          encrypted: false,
                          content: JSON.stringify(data.messages),
                          type: "text",
                          timestamp: Date.now().toString(),
                        }}
                        messageid={"a"}
                        name={data.userName}
                        time={Date.now().toString()}
                        isPrimary={true}
                        isFetch={true}
                      />
                    );
                  }
                })}
              </div>
            </div>
          </div>
        </div>
        <div class="bottom-5 fixed w-full hidden lg:block">
          <div class="w-[800px] py-[8px] mx-auto rounded-xl bg-[rgba(25,35,32,0.5)] flex overflow-hidden">
            <p class="text-white mx-auto">
              ここに接続済みサーバーが表示されえる予定です
            </p>
          </div>
        </div>
      </>
    </>
  );
}
