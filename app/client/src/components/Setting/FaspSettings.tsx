import {
  Component,
  createEffect,
  createResource,
  createSignal,
  For,
  Show,
} from "solid-js";
import {
  approveRegistration,
  fetchConfig,
  fetchProviderInfo,
  fetchRegistrations,
  saveConfig,
  toggleCapability,
} from "./faspApi.ts";
import { b64ToBuf, bufToB64 } from "../../../../shared/buffer.ts";
import type {
  FaspConfigDoc,
  FaspRegistrationDoc,
} from "../../../../shared/types.ts";

/**
 * docs/FASP.md 4章の手順に基づく FASP 設定画面。
 * 登録済み FASP の承認と capability 切替を提供する。
 */
const FaspSettings: Component = () => {
  const [cfg, { refetch: refetchConfig }] = createResource(fetchConfig);
  const [regs, { refetch }] = createResource(fetchRegistrations);

  const [enabled, setEnabled] = createSignal(false);
  const [baseUrl, setBaseUrl] = createSignal("");
  const [caps, setCaps] = createSignal<Record<string, string>>({});

  createEffect(() => {
    const c = cfg();
    if (c) {
      setEnabled(c.enabled);
      setBaseUrl(c.base_url);
      setCaps({ ...c.capabilities });
    }
  });

  const save = async () => {
    const ok = await saveConfig({
      enabled: enabled(),
      base_url: baseUrl(),
      capabilities: caps(),
    } as FaspConfigDoc);
    if (ok) await refetchConfig();
  };

  const calcFingerprint = async (pubKey: string) => {
    const hash = await crypto.subtle.digest("SHA-256", b64ToBuf(pubKey));
    return bufToB64(hash);
  };

  return (
    <div class="space-y-4">
      <h3 class="text-xl font-bold">FASP設定</h3>
      <div class="border p-2 space-y-2">
        <div class="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={enabled()}
            onChange={(e) => setEnabled(e.currentTarget.checked)}
          />
          <span>有効化</span>
        </div>
        <div>
          <label class="block">Base URL</label>
          <input
            class="border w-full"
            type="text"
            value={baseUrl()}
            onInput={(e) => setBaseUrl(e.currentTarget.value)}
          />
        </div>
        <div>
          <div>提供Capabilities</div>
          <For each={["data_sharing", "trends", "account_search"]}>
            {(id) => (
              <div class="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={caps()[id] !== undefined}
                  onChange={(e) =>
                    setCaps((prev) => {
                      const next = { ...prev };
                      if (e.currentTarget.checked) {
                        next[id] = prev[id] ?? "0.1";
                      } else {
                        delete next[id];
                      }
                      return next;
                    })}
                />
                <span>{id}</span>
                <Show when={caps()[id] !== undefined}>
                  <input
                    class="border w-16"
                    type="text"
                    value={caps()[id]}
                    onInput={(e) =>
                      setCaps((prev) => ({
                        ...prev,
                        [id]: e.currentTarget.value,
                      }))}
                  />
                </Show>
              </div>
            )}
          </For>
        </div>
        <button
          type="button"
          class="px-2 py-1 bg-blue-500 text-white rounded"
          onClick={save}
        >
          保存
        </button>
      </div>
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
