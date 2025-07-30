import type { Layer } from "../types/story";

export default function Inspector(props: {
  layer: Layer | undefined;
  update: (layer: Layer) => void;
}) {
  const layer = () => props.layer;

  return (
    <div class="w-48 bg-gray-900 text-white p-2 text-sm space-y-2">
      {layer() && layer()!.layerType === "text" && (
        <textarea
          class="w-full h-24 bg-gray-800"
          value={layer()!.text}
          onInput={(e) =>
            props.update({
              ...(layer() as Layer),
              text: e.currentTarget.value,
            })}
        />
      )}
      {layer() && layer()!.layerType === "image" && <p>画像レイヤ</p>}
    </div>
  );
}
