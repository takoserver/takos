import { createSignal, For, onMount } from "solid-js";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

export interface Overlay {
  id: string;
  kind: "mention" | "question";
  ref?: string;
  bbox: [number, number, number, number];
  rotation?: number;
}

export default function StoryEditor(props: {
  mediaUrl?: string;
  onExport: (dataUrl: string, overlays: Overlay[]) => void;
}) {
  const [overlays, setOverlays] = createSignal<Overlay[]>([]);
  const [isVideo, setIsVideo] = createSignal(false);
  let canvasRef: HTMLCanvasElement | undefined;
  const img = new Image();
  const ffmpeg = createFFmpeg({ log: false });
  let videoData: Uint8Array | undefined;

  onMount(() => {
    if (props.mediaUrl) loadMedia(props.mediaUrl);
  });

  async function loadMedia(url: string) {
    if (url.match(/\.mp4$/)) {
      setIsVideo(true);
      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }
      const data = await fetchFile(url);
      videoData = data;
      ffmpeg.FS("writeFile", "in.mp4", data);
      await ffmpeg.run(
        "-i",
        "in.mp4",
        "-frames:v",
        "1",
        "-vf",
        "scale=720:1280",
        "thumb.png",
      );
      const imgData = ffmpeg.FS("readFile", "thumb.png");
      const blob = new Blob([imgData.buffer], { type: "image/png" });
      img.src = URL.createObjectURL(blob);
      img.onload = drawImage;
    } else {
      setIsVideo(false);
      img.src = url;
      img.onload = drawImage;
    }
  }

  function drawImage() {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext("2d")!;
    canvasRef.width = 720;
    canvasRef.height = 1280;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    ctx.drawImage(img, 0, 0, canvasRef.width, canvasRef.height);
    ctx.fillStyle = "white";
    ctx.font = "24px sans-serif";
    overlays().forEach((ov) => {
      const x = ov.bbox[0] * canvasRef.width;
      const y = ov.bbox[1] * canvasRef.height;
      ctx.fillText(ov.kind, x, y + 24);
    });
  }

  function addOverlay(kind: "mention" | "question") {
    const id = crypto.randomUUID();
    setOverlays([...overlays(), { id, kind, bbox: [0.4, 0.4, 0.2, 0.1] }]);
    drawImage();
  }

  async function exportMedia() {
    if (!canvasRef) return;
    if (isVideo()) {
      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }
      if (videoData) {
        ffmpeg.FS("writeFile", "in.mp4", videoData);
      }
      const filter = overlays()
        .map((ov) =>
          `drawtext=text='${ov.kind}':x=main_w*${ov.bbox[0]}:y=main_h*${
            ov.bbox[1]
          }:fontsize=24:fontcolor=white`
        )
        .join(",");
      const vf = filter ? `scale=720:1280,${filter}` : "scale=720:1280";
      await ffmpeg.run(
        "-i",
        "in.mp4",
        "-vf",
        vf,
        "-pix_fmt",
        "yuv420p",
        "out.mp4",
      );
      const data = ffmpeg.FS("readFile", "out.mp4");
      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      props.onExport(url, overlays());
    } else {
      const url = canvasRef.toDataURL("image/png");
      props.onExport(url, overlays());
    }
  }

  return (
    <div class="space-y-2">
      <canvas ref={canvasRef!} class="border rounded w-full" />
      <div class="space-x-2">
        <button
          type="button"
          class="px-2 py-1 bg-blue-700"
          onClick={() => addOverlay("mention")}
        >
          @メンション
        </button>
        <button
          type="button"
          class="px-2 py-1 bg-green-700"
          onClick={() => addOverlay("question")}
        >
          質問箱
        </button>
        <button
          type="button"
          class="px-2 py-1 bg-gray-700"
          onClick={exportMedia}
        >
          Export
        </button>
      </div>
      <For each={overlays()}>
        {(ov) => <div class="text-sm text-white">{ov.kind} {ov.id}</div>}
      </For>
    </div>
  );
}
