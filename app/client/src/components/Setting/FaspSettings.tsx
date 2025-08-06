import { Component, createResource, createSignal, For, Show } from "solid-js";
import {
  approveRegistration,
  fetchProviderInfo,
  fetchRegistrations,
  toggleCapability,
} from "./faspApi.ts";
import { b64ToBuf, bufToB64 } from "../../../../shared/buffer.ts";
import type { FaspRegistrationDoc } from "../../../../shared/types.ts";

/**
 * docs/FASP.md 4章の手順に基づく FASP 設定画面。
 * 登録済み FASP の承認と capability 切替を提供する。
 */
const FaspSettings: Component = () => {
  const [regs, { refetch }] = createResource(fetchRegistrations);

  const calcFingerprint = async (pubKey: string) => {
    const hash = await crypto.subtle.digest("SHA-256", b64ToBuf(pubKey));
    return bufToB64(hash);
  };

  return (
    <div class="space-y-4">
      <h3 class="text-xl font-bold">FASP設定</h3>
      <Show
        when={regs()?.length}
        fallback={<div>登録されたFASPはありません</div>}
      >
        <For each={regs()}>
          {(reg: FaspRegistrationDoc) => {
            const [fp] = createResource(() => reg.public_key, calcFingerprint);
            const [provider] = createResource(
              () => reg.base_url,
              fetchProviderInfo,
            );
            const [active, setActive] = createSignal(
              new Set(reg.capabilities.map((c) => `${c.id}@${c.version}`)),
            );
            const onApprove = async () => {
              const ok = await approveRegistration(reg.fasp_id);
              if (ok) await refetch();
            };
            const onToggle = async (
              cap: { id: string; version: string },
              enable: boolean,
              el: HTMLInputElement,
            ) => {
              const ok = await toggleCapability(reg, cap, enable);
              if (ok) {
                setActive((prev) => {
                  const s = new Set(prev);
                  const key = `${cap.id}@${cap.version}`;
                  if (enable) s.add(key);
                  else s.delete(key);
                  return s;
                });
              } else {
                el.checked = !enable;
              }
            };
            return (
              <div class="border p-2 space-y-2">
                <div>名称: {reg.name}</div>
                <div>Base URL: {reg.base_url}</div>
                <div>
                  指紋: <Show when={fp()}>{fp()}</Show>
                </div>
                <Show when={!reg.approved}>
                  <button
                    type="button"
                    class="px-2 py-1 bg-blue-500 text-white rounded"
                    onClick={onApprove}
                  >
                    承認
                  </button>
                </Show>
                <Show when={reg.approved && provider()}>
                  <ul class="space-y-1">
                    <For each={provider()!.capabilities}>
                      {(cap) => {
                        const key = `${cap.id}@${cap.version}`;
                        return (
                          <li class="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={active().has(key)}
                              onChange={(e) =>
                                onToggle(
                                  cap,
                                  e.currentTarget.checked,
                                  e.currentTarget,
                                )}
                            />
                            <span>{cap.id} v{cap.version}</span>
                          </li>
                        );
                      }}
                    </For>
                  </ul>
                </Show>
              </div>
            );
          }}
        </For>
      </Show>
    </div>
  );
};

export default FaspSettings;
