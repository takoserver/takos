import { domainState, EncryptedSessionState, sessionidState, setUpState } from "../../utils/state";
import {
  migrateKeyPrivateState,
  migrateKeyPublicState,
  migrateSessionid,
  migrateSignKeyPrivateState,
  migrateSignKeyPublicState,
  showMigrateRequest,
} from "../../utils/migrateState";
import { atom, useAtom, useSetAtom } from "solid-jotai";
import { PopUpFrame } from "./setupPopup/popUpFrame";
import { createEffect, createSignal } from "solid-js";
import { generateMigrateKey, generate } from "@takos/takos-encrypt-ink";
import { requester } from "../../utils/requester";

export function EncryptSession() {
  const [EncryptedSession, setEncryptedSession] = useAtom(
    EncryptedSessionState,
  );
  const [setUp, setSetUp] = useAtom(setUpState);
  const [isOpen, setIsOpen] = createSignal(false);
  const [setted, setSetted] = createSignal(false);
  const [page, setPage] = createSignal(1);
  const [domain] = useAtom(domainState);
  const setMigrateKeyPublic = useSetAtom(migrateKeyPublicState);
  const setMigrateKeyPrivate = useSetAtom(migrateKeyPrivateState);
  const setMigrateSignKeyPublic = useSetAtom(migrateSignKeyPublicState);
  const setMigrateSignKeyPrivate = useSetAtom(migrateSignKeyPrivateState);
  const [sessionid] = useAtom(sessionidState);

  createEffect(() => {
    if (!EncryptedSession() && !setted() && setUp()) {
      setIsOpen(true);
    }
  });
  return (
    <>
      {isOpen() && (
        <PopUpFrame closeScript={setIsOpen}>
          <div class="h-full w-full flex items-center justify-center">
            <div class="max-w-md w-full px-6">
              <h1 class="text-2xl font-semibold text-center mb-6">
                セッションの暗号化
              </h1>
              <div>
                {page() === 1 && (
                  <>
                    <div class="mb-4">
                      <button class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                      onClick={async () => {
                        const migrateKey = generateMigrateKey();
                        setMigrateKeyPublic(migrateKey.public);
                        setMigrateKeyPrivate(migrateKey.private);
                        const server = domain();
                        if(!server) return;
                        const response = await requester(server, "requestMigrate", {
                          migrateKey: migrateKey.public,
                          sessionid: sessionid()
                        })
                        const migrateData = await response.json();
                        console.log(migrateData);
                        setPage(2);
                      }}>
                        既存のセッションから鍵をリクエスト
                      </button>
                    </div>
                    <div>
                      <button class="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
                        新しい鍵を作成
                      </button>
                    </div>
                  </>
                )}
                {page() === 2 && (
                  <>
                    {/* show hash page */}
                  </>
                )}
                {page() === 3 && (
                  <>
                    {/* result page */}
                  </>
                )}
              </div>
            </div>
          </div>
        </PopUpFrame>
      )}
      <AcceptMigrateKey />
    </>
  );
}

export function AcceptMigrateKey() {
  const [showMigrate, setShowMigrate] = useAtom(showMigrateRequest);
  const pageState = atom(1);
  const [page, setPage] = useAtom(pageState);
  const [migrateSession] = useAtom(migrateSessionid);
  return (
    <>
      {showMigrate() && (
        <PopUpFrame closeScript={setShowMigrate}>
          <div class="h-full w-full flex items-center justify-center">
            <div class="max-w-md w-full px-6">
              <h1 class="text-2xl font-semibold text-center mb-6">
                セッションの暗号化
              </h1>
              <div>
                {page() === 1 && (
                  <>
                    <div class="mb-4">
                      <button
                        class="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                        onClick={() => {
                          if(!migrateSession()) return;
                          const migrateSignKey = generateMigrateSignKey()
                          setPage(2);
                        }}
                      >
                        鍵を受け入れる
                      </button>
                    </div>
                    <div>
                      <button
                        class="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                        onClick={() => setShowMigrate(false)}
                      >
                        鍵を拒否する
                      </button>
                    </div>
                  </>
                )}
                {page() === 2 && (
                  <>
                    <div class="mb-4">
                      {/* input page */}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </PopUpFrame>
      )}
    </>
  );
}
