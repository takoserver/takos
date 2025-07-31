import { createSignal, onMount, Show } from "solid-js";
import type { StoryCanvasState } from "./state.ts";
import { createInitialState } from "./state.ts";
import { Image as KonvaImage, Layer, Stage } from "solid-konva";
import type Konva from "konva";

interface Props {
  mediaUrl: string;
  onCancel: () => void;
  onSubmit: (state: StoryCanvasState, blobUrl: string) => void;
}

export default function StoryEditor(props: Props) {
  const [state, _setState] = createSignal<StoryCanvasState>(
    createInitialState(props.mediaUrl, 1080, 1920),
  );
  let imageObj: HTMLImageElement;

  onMount(() => {
    const img = new globalThis.Image();
    img.src = props.mediaUrl;
    img.onload = () => {
      imageObj = img;
    };
  });

  const exportImage = async () => {
    const stage = stageRef!;
    const dataUrl = stage.toDataURL({ pixelRatio: 1 });
    const blob = await (await fetch(dataUrl)).blob();
    const blobUrl = URL.createObjectURL(blob);
    props.onSubmit(state(), blobUrl);
  };

  let stageRef: Konva.Stage | null = null;

  return (
    <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
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
              <Show when={imageObj}>
                <KonvaImage image={imageObj} width={360} height={640} />
              </Show>
            </Layer>
          </Stage>
        </div>
        <div class="flex justify-end space-x-2">
          <button
            type="button"
            class="px-4 py-2 bg-gray-700 rounded"
            onClick={props.onCancel}
          >
            キャンセル
          </button>
          <button
            type="button"
            class="px-4 py-2 bg-blue-600 rounded"
            onClick={exportImage}
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
}
