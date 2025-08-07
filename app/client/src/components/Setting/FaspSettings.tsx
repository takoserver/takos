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

  const load = async () => {
    try {
      const res = await apiFetch("/admin/fasps");
      const data = (await res.json()) as { fasps: Fasp[] };
      setFasps(data.fasps);
    } catch (err) {
      console.error("failed to fetch fasps", err);
    }
  };

  const accept = async (id: string) => {
    try {
      await apiFetch(`/admin/fasps/${id}/accept`, { method: "POST" });
      await load();
    } catch (err) {
      console.error("accept failed", err);
    }
  };

  const remove = async (id: string) => {
    try {
      await apiFetch(`/admin/fasps/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      console.error("delete failed", err);
    }
  };

  onMount(load);

  return (
    <div class="space-y-2">
      <h3 class="text-xl font-bold">FASP 設定</h3>
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
