import { createSignal, For, onMount } from "solid-js";
import { apiFetch } from "../../utils/config.ts";

interface Fasp {
  _id: string;
  name: string;
  baseUrl: string;
  accepted: boolean;
}

const FaspSettings = () => {
  const [fasps, setFasps] = createSignal<Fasp[]>([]);
  const [name, setName] = createSignal("");
  const [baseUrl, setBaseUrl] = createSignal("");
  const [serverId, setServerId] = createSignal("");
  const [publicKey, setPublicKey] = createSignal("");

  const load = async () => {
    try {
      const res = await apiFetch("/api/fasp");
      const data = (await res.json()) as { fasps: Fasp[] };
      setFasps(data.fasps);
    } catch (err) {
      console.error("failed to fetch fasps", err);
    }
  };

  const accept = async (id: string) => {
    try {
      await apiFetch(`/api/fasp/${id}/accept`, { method: "POST" });
      await load();
    } catch (err) {
      console.error("accept failed", err);
    }
  };

  const remove = async (id: string) => {
    try {
      await apiFetch(`/api/fasp/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      console.error("delete failed", err);
    }
  };

  const add = async () => {
    try {
      await apiFetch("/api/fasp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      await load();
    } catch (err) {
      console.error("add failed", err);
    }
  };

  onMount(load);

  return (
    <div class="space-y-2">
      <h3 class="text-xl font-bold">FASP 設定</h3>
      <div class="space-y-1">
        <input
          class="w-full border p-1"
          placeholder="名前"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
        />
        <input
          class="w-full border p-1"
          placeholder="Base URL"
          value={baseUrl()}
          onInput={(e) => setBaseUrl(e.currentTarget.value)}
        />
        <input
          class="w-full border p-1"
          placeholder="Server ID"
          value={serverId()}
          onInput={(e) => setServerId(e.currentTarget.value)}
        />
        <textarea
          class="w-full border p-1"
          placeholder="公開鍵"
          value={publicKey()}
          onInput={(e) => setPublicKey(e.currentTarget.value)}
        />
        <button
          type="button"
          class="px-3 py-1 bg-blue-600 text-white rounded"
          onClick={add}
        >
          追加
        </button>
      </div>
      <ul class="space-y-2">
        <For each={fasps()}>
          {(f) => (
            <li class="border p-2 rounded">
              <div class="font-semibold">{f.name}</div>
              <div class="text-sm break-all">{f.baseUrl}</div>
              <div class="flex space-x-2 mt-1">
                {!f.accepted && (
                  <button
                    type="button"
                    class="text-sm text-blue-600"
                    onClick={() => accept(f._id)}
                  >
                    承認
                  </button>
                )}
                <button
                  type="button"
                  class="text-sm text-red-600"
                  onClick={() => remove(f._id)}
                >
                  削除
                </button>
              </div>
            </li>
          )}
        </For>
      </ul>
      <button
        type="button"
        class="px-3 py-1 bg-gray-200 rounded"
        onClick={load}
      >
        更新
      </button>
    </div>
  );
};

export default FaspSettings;
