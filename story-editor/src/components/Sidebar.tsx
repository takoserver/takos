import { createSignal, For } from "solid-js";

export default function Sidebar(props: { addImage: (url: string) => void }) {
  const [assets, setAssets] = createSignal<string[]>([]);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (const file of files) {
      if (file.type.startsWith("image")) {
        const url = URL.createObjectURL(file);
        setAssets((a) => [...a, url]);
        props.addImage(url);
      }
    }
  };

  return (
    <div
      class="w-32 bg-gray-800 text-white overflow-y-auto"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div class="p-2 text-sm">画像をドロップ</div>
      <For each={assets()}>{(a) => <img src={a} class="w-full" />}</For>
    </div>
  );
}
