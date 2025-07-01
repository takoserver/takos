import { createSignal, For, onMount } from "solid-js";

interface Props {
  hideHeader?: boolean;
}

export default function ExtensionUpload(props: Props = {}) {
  const [message, setMessage] = createSignal("");
  const [extensions, setExtensions] = createSignal<
    { identifier: string; name: string; version: string; icon?: string }[]
  >([]);

  const fetchExtensions = async () => {
    const body = {
      events: [
        { identifier: "takos", eventId: "extensions:list", payload: null },
      ],
    };
    const res = await fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const data = await res.json();
      const list: {
        identifier: string;
        name: string;
        version: string;
        icon?: string;
      }[] = data[0]?.result ?? [];
      setExtensions(list);
    }
  };

  onMount(fetchExtensions);

  const handleChange = async (e: Event) => {
    const files = (e.target as HTMLInputElement).files;
    if (!files || !files[0]) return;
    const buf = await files[0].arrayBuffer();
    const bin = new Uint8Array(buf);
    let binary = "";
    for (const b of bin) {
      binary += String.fromCharCode(b);
    }
    const base64 = btoa(binary);
    const body = {
      events: [
        {
          identifier: "takos",
          eventId: "extensions:upload",
          payload: { data: base64 },
        },
      ],
    };
    const res = await fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setMessage("Uploaded");
      fetchExtensions();
    } else setMessage("Failed");
  };

  return (
    <div>
      {!props.hideHeader && <h3 class="text-lg mb-2">Upload Extension</h3>}
      <input type="file" onChange={handleChange} />
      <p>{message()}</p>
      <ul class="mt-3 space-y-2">
        <For each={extensions()}>
          {(ext) => (
            <li class="flex items-center space-x-2">
              <span>
                {ext.icon
                  ? <img src={ext.icon} class="w-6 h-6" alt={ext.name} />
                  : <span class="w-6 h-6 bg-gray-500 inline-block" />}
              </span>
              <span class="flex-1">
                {ext.name}{" "}
                <span class="text-xs text-gray-500">v{ext.version}</span>
              </span>
              <button
                type="button"
                class="text-sm text-blue-500 underline"
                onClick={() => {
                  globalThis.open(
                    `/api/extensions/${ext.identifier}/ui`,
                    "_blank",
                  );
                }}
              >
                Open
              </button>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
