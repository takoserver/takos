import { createSignal, For, onMount } from "solid-js";
import { req } from "../api.ts";
import PackageCard from "./PackageCard.tsx";

interface Pack {
  identifier: string;
  name?: string;
  version: string;
  description?: string;
}

export default function PackageSection() {
  const [packages, setPackages] = createSignal<Pack[]>([]);
  const [query, setQuery] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  let idInput!: HTMLInputElement;
  let nameInput!: HTMLInputElement;
  let versionInput!: HTMLInputElement;
  let descInput!: HTMLInputElement;
  let urlInput!: HTMLInputElement;
  let shaInput!: HTMLInputElement;

  const search = async () => {
    setLoading(true);
    const q = query().trim();
    const url = q
      ? `/_takopack/search?q=${encodeURIComponent(q)}`
      : "/_takopack/index.json";
    const data = await req<{ packages: Pack[] }>(url);
    setPackages(data.packages);
    setLoading(false);
  };

  onMount(search);

  const add = async () => {
    await req("/api/packages", "POST", {
      identifier: idInput.value,
      name: nameInput.value,
      version: versionInput.value,
      description: descInput.value,
      downloadUrl: urlInput.value,
      sha256: shaInput.value || undefined,
    });
    search();
  };

  return (
    <section>
      <div class="mb-4 flex items-center gap-2">
        <input
          class="flex-1 border border-gray-300 p-2 rounded"
          type="search"
          placeholder="Search packages..."
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
        <button
          type="button"
          class="px-3 py-2 bg-blue-600 text-white rounded"
          onClick={search}
        >
          Search
        </button>
      </div>
      {loading() && <p class="text-gray-600 mb-2">Loading...</p>}
      <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 mb-8">
        <For each={packages()}>{(p) => (
          <PackageCard
            identifier={p.identifier}
            version={p.version}
            description={p.description}
          />
        )}</For>
      </div>
      <h3 class="text-lg font-semibold mb-2">Add</h3>
      <div class="grid grid-cols-2 gap-2 mb-2">
        <input
          class="border border-gray-300 p-1 rounded"
          ref={idInput!}
          placeholder="com.example.foo"
        />
        <input
          class="border border-gray-300 p-1 rounded"
          ref={nameInput!}
          placeholder="name"
        />
        <input
          class="border border-gray-300 p-1 rounded"
          ref={versionInput!}
          placeholder="1.0.0"
        />
        <input
          class="border border-gray-300 p-1 rounded"
          ref={descInput!}
          placeholder="description"
        />
        <input
          class="border border-gray-300 p-1 rounded col-span-2"
          ref={urlInput!}
          placeholder="download url"
        />
        <input
          class="border border-gray-300 p-1 rounded col-span-2"
          ref={shaInput!}
          placeholder="sha256(optional)"
        />
      </div>
      <button
        type="button"
        class="px-3 py-1 bg-blue-500 text-white rounded"
        onClick={add}
      >
        Add Package
      </button>
    </section>
  );
}
