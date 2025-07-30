import { createSignal, For } from "solid-js";
import type { Layer } from "../types/story";
import { toCssMatrix } from "../lib/mat2d";

export default function Stage(props: {
  layers: Layer[];
  width: number;
  height: number;
  selectLayer: (id: string) => void;
  selected?: string;
}) {
  const [dragId, setDragId] = createSignal<string | null>(null);

  const handlePointerDown = (e: PointerEvent, id: string) => {
    setDragId(id);
    props.selectLayer(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    const id = dragId();
    if (!id) return;
    const layer = props.layers.find((l) => l.id === id);
    if (!layer) return;
    layer.transform[4] += e.movementX / props.width;
    layer.transform[5] += e.movementY / props.height;
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (dragId()) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDragId(null);
    }
  };

  return (
    <svg
      viewBox="0 0 1 1"
      width={props.width}
      height={props.height}
      style="background:#222"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <For each={props.layers.sort((a, b) => (a.z ?? 0) - (b.z ?? 0))}>
        {(layer) => (
          <g
            transform={toCssMatrix(layer.transform, 1, 1)}
            onPointerDown={(e) => handlePointerDown(e, layer.id)}
            style={`cursor:${props.selected === layer.id ? "move" : "pointer"}`}
          >
            {layer.layerType === "image" && (
              <image href={layer.media} width="1" height="1" />
            )}
            {layer.layerType === "text" && (
              <foreignObject width="1" height="1">
                <div
                  style={`font-size:${layer.fontSize || 0.05}em;color:${
                    layer.color || "#fff"
                  }`}
                >
                  {layer.text}
                </div>
              </foreignObject>
            )}
          </g>
        )}
      </For>
    </svg>
  );
}
