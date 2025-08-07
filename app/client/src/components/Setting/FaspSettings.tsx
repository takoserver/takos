import { Component, createResource, createSignal, For, Show } from "solid-js";
import { apiFetch } from "../../utils/config.ts";

interface Capability {
  identifier: string;
  version: string;
  enabled: boolean;
}

interface FaspItem {
  _id: string;
  name: string;
  baseUrl: string;
  accepted: boolean;
  capabilities: Capability[];
}

async function fetchFasps(): Promise<FaspItem[]> {
  const res = await apiFetch("/admin/fasps");
  if (!res.ok) return [];
  const data = await res.json() as { fasps: FaspItem[] };
  return data.fasps;
}

const FaspSettings: Component = () => {
  const [fasps, { refetch }] = createResource(fetchFasps);
  const [loadingInfo, setLoadingInfo] = createSignal(false);
  const [name, setName] = createSignal("");
  const [baseUrl, setBaseUrl] = createSignal("");
  const [serverId, setServerId] = createSignal("");
  const [publicKey, setPublicKey] = createSignal("");

  const refreshInfo = async () => {
    setLoadingInfo(true);
    try {
      await apiFetch("/admin/fasps/provider_info");
    } finally {
      setLoadingInfo(false);
      refetch();
    }
  };

  const accept = async (id: string) => {
    await apiFetch(`/admin/fasps/${id}/accept`, { method: "POST" });
    refetch();
  };

  const remove = async (id: string) => {
    await apiFetch(`/admin/fasps/${id}`, { method: "DELETE" });
    refetch();
  };

  const toggleCapability = async (
    id: string,
    version: string,
    enabled: boolean,
  ) => {
    const method = enabled ? "POST" : "DELETE";
    await apiFetch(
      `/admin/fasps/capabilities/${id}/${version}/activation`,
      { method },
    );
    refetch();
  };

  const registerFasp = async () => {
    await apiFetch("/admin/fasps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name(),
        baseUrl: baseUrl(),
        serverId: serverId(),
        publicKey: publicKey(),
      }),
    });
    setName("");
    setBaseUrl("");
    setServerId("");
    setPublicKey("");
    refetch();
  };

  return (
    <div class="space-y-4">
      <div class="flex items-center space-x-2">
        <h3 class="text-xl font-bold">FASP 設定</h3>
        <button
          type="button"
          class="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
          onClick={refreshInfo}
          disabled={loadingInfo()}
        >
          {loadingInfo() ? "更新中..." : "プロバイダー情報取得"}
        </button>
      </div>
      <div class="border rounded p-3 space-y-2">
        <h4 class="font-medium">FASP 接続</h4>
        <div class="space-y-1">
          <input
            class="w-full border p-1 rounded"
            placeholder="名前"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
          />
          <input
            class="w-full border p-1 rounded"
            placeholder="Base URL"
            value={baseUrl()}
            onInput={(e) => setBaseUrl(e.currentTarget.value)}
          />
          <input
            class="w-full border p-1 rounded"
            placeholder="Server ID"
            value={serverId()}
            onInput={(e) => setServerId(e.currentTarget.value)}
          />
          <input
            class="w-full border p-1 rounded"
            placeholder="公開鍵(Base64)"
            value={publicKey()}
            onInput={(e) => setPublicKey(e.currentTarget.value)}
          />
          <button
            type="button"
            class="px-2 py-1 bg-blue-500 text-white rounded"
            onClick={registerFasp}
          >
            登録
          </button>
        </div>
      </div>
      <For each={fasps()}>
        {(f) => (
          <div class="border rounded p-3 space-y-2">
            <div class="flex justify-between items-center">
              <div>
                <p class="font-semibold">{f.name}</p>
                <p class="text-sm text-gray-600 break-all">{f.baseUrl}</p>
              </div>
              <Show
                when={f.accepted}
                fallback={
                  <button
                    type="button"
                    class="px-2 py-1 bg-green-500 text-white rounded"
                    onClick={() => accept(f._id)}
                  >
                    承認
                  </button>
                }
              >
                <button
                  type="button"
                  class="px-2 py-1 bg-red-500 text-white rounded"
                  onClick={() => remove(f._id)}
                >
                  削除
                </button>
              </Show>
            </div>
            <Show when={f.capabilities?.length}>
              <div class="space-y-1">
                <h4 class="font-medium">利用可能なCapability</h4>
                <ul class="space-y-1">
                  <For each={f.capabilities}>
                    {(c) => (
                      <li class="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={c.enabled}
                          onChange={(e) =>
                            toggleCapability(
                              c.identifier,
                              c.version,
                              e.currentTarget.checked,
                            )}
                        />
                        <span>{c.identifier} v{c.version}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
};

export default FaspSettings;
