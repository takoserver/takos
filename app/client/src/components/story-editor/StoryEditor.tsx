import { createEffect, createSignal, For, onMount, Show } from "solid-js";
import type { DrawableLayer, StoryCanvasState } from "./state.ts";
import { createInitialState } from "./state.ts";
import {
  Image as KonvaImage,
  Layer,
  Stage,
  Text as KonvaText,
  Transformer,
} from "solid-konva";
import type Konva from "konva";

interface Props {
  mediaUrl: string;
  onCancel: () => void;
  onSubmit: (state: StoryCanvasState, blobUrl: string) => void;
}

export default function StoryEditor(props: Props) {
  const [state, setState] = createSignal<StoryCanvasState>(
    createInitialState(props.mediaUrl, 1080, 1920),
  );
  const [baseImageObj, setBaseImageObj] = createSignal<HTMLImageElement | null>(
    null,
  );
  const [layers, setLayers] = createSignal<DrawableLayer[]>([]);
  const [imageMap, setImageMap] = createSignal<
    Record<string, HTMLImageElement>
  >({});
  const [selectedId, setSelectedId] = createSignal<string | null>(null);

  onMount(() => {
    const img = new globalThis.Image();
    img.crossOrigin = "anonymous";
    img.src = props.mediaUrl;
    img.onload = () => {
      setBaseImageObj(img);
    };
  });

  const exportImage = async () => {
    const stage = stageRef!;
    const dataUrl = stage.toDataURL({ pixelRatio: 1 });
    const blob = await (await fetch(dataUrl)).blob();
    const blobUrl = URL.createObjectURL(blob);
    setState((prev) => ({ ...prev, drawableLayers: layers() }));
    props.onSubmit(state(), blobUrl);
  };

  let stageRef: Konva.Stage | null = null;
  let transformerRef: Konva.Transformer | null = null;
  const nodeMap = new Map<string, Konva.Node>();

  const updateLayer = (id: string, node: Konva.Node) => {
    const bbox: [number, number, number, number] = [
      node.x() / 360,
      node.y() / 640,
      (node.width() * node.scaleX()) / 360,
      (node.height() * node.scaleY()) / 640,
    ];
    const rotation = node.rotation();
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, bbox, rotation } : l))
    );
  };

  const addText = () => {
    const text = prompt("テキストを入力");
    if (!text) return;
    const id = crypto.randomUUID();
    const layer: DrawableLayer = {
      id,
      kind: "text",
      bbox: [0.25, 0.4, 0.5, 0.1],
      rotation: 0,
      opacity: 1,
      payload: { text },
      z: layers().length + 1,
    };
    setLayers((prev) => [...prev, layer]);
  };

  let overlayInputRef: HTMLInputElement | undefined;
  const addImageLayer = () => {
    overlayInputRef?.click();
  };

  const handleOverlayChange = (e: Event) => {
    const files = (e.currentTarget as HTMLInputElement).files;
    if (!files || files.length === 0) return;
    const url = URL.createObjectURL(files[0]);
    const img = new globalThis.Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      const id = crypto.randomUUID();
      setImageMap((prev) => ({ ...prev, [id]: img }));
      const layer: DrawableLayer = {
        id,
        kind: "image",
        bbox: [0.25, 0.25, 0.5, 0.5],
        rotation: 0,
        opacity: 1,
        payload: {},
        z: layers().length + 1,
      };
      setLayers((prev) => [...prev, layer]);
    };
    if (overlayInputRef) overlayInputRef.value = "";
  };

  createEffect(() => {
    if (transformerRef && selectedId()) {
      const node = nodeMap.get(selectedId()!);
      if (node) {
        transformerRef.nodes([node]);
      }
    }
  });

  return (
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <input
        type="file"
        accept="image/*"
        class="hidden"
        ref={(el) => (overlayInputRef = el ?? undefined)}
        onChange={handleOverlayChange}
      />
      <div class="bg-gray-900 p-4 rounded-xl w-full max-w-md">
        <div class="aspect-[9/16] bg-black mb-4">
          <Stage
            width={360}
            height={640}
            ref={(s) => {
              stageRef = s;
            }}
          >
            <Layer>
              <Show when={baseImageObj()}>
                <KonvaImage image={baseImageObj()!} width={360} height={640} />
              </Show>
              <For each={layers()}>
                {(layer) => (
                  <>
                    {layer.kind === "image" && (
                      <KonvaImage
                        ref={(node) => node && nodeMap.set(layer.id, node)}
                        image={imageMap()[layer.id]}
                        x={layer.bbox[0] * 360}
                        y={layer.bbox[1] * 640}
                        width={layer.bbox[2] * 360}
                        height={layer.bbox[3] * 640}
                        rotation={layer.rotation}
                        opacity={layer.opacity}
                        draggable
                        onClick={() => setSelectedId(layer.id)}
                        onDragEnd={(e) => updateLayer(layer.id, e.target)}
                        onTransformEnd={(e) => updateLayer(layer.id, e.target)}
                      />
                    )}
                    {layer.kind === "text" && (
                      <KonvaText
                        ref={(node) => node && nodeMap.set(layer.id, node)}
                        text={(layer.payload as { text: string }).text}
                        fontSize={24}
                        fill="white"
                        x={layer.bbox[0] * 360}
                        y={layer.bbox[1] * 640}
                        width={layer.bbox[2] * 360}
                        rotation={layer.rotation}
                        opacity={layer.opacity}
                        draggable
                        onClick={() => setSelectedId(layer.id)}
                        onDragEnd={(e) => updateLayer(layer.id, e.target)}
                        onTransformEnd={(e) => updateLayer(layer.id, e.target)}
                      />
                    )}
                  </>
                )}
              </For>
              <Transformer
                ref={(tr) => (transformerRef = tr ?? null)}
                boundBoxFunc={(_oldBox, newBox) => {
                  newBox.width = Math.max(10, newBox.width);
                  newBox.height = Math.max(10, newBox.height);
                  return newBox;
                }}
              />
            </Layer>
          </Stage>
        </div>
        <div class="flex justify-between mb-2 space-x-2">
          <button
            type="button"
            class="px-3 py-1 bg-gray-700 rounded"
            onClick={addText}
          >
            テキスト追加
          </button>
          <button
            type="button"
            class="px-3 py-1 bg-gray-700 rounded"
            onClick={addImageLayer}
          >
            画像追加
          </button>
          <div class="flex-1" />
          <button
            type="button"
            class="px-3 py-1 bg-gray-700 rounded"
            onClick={props.onCancel}
          >
            キャンセル
          </button>
          <button
            type="button"
            class="px-3 py-1 bg-blue-600 rounded"
            onClick={exportImage}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
