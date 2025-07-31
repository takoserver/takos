import { createEffect, createSignal, For, onCleanup, onMount } from "solid-js";
import { FFmpeg } from "https://esm.sh/@ffmpeg/ffmpeg@0.12.15?target=deno";
import { fetchFile } from "https://esm.sh/@ffmpeg/util@0.12.2?target=deno";

export interface Overlay {
  id: string;
  kind: "mention" | "question" | "text" | "image";
  ref?: string;
  text?: string;
  src?: string;
  bbox: [number, number, number, number];
  rotation?: number;
}

export default function StoryEditor(props: {
  mediaUrl?: string;
  mediaFile?: File;
  onExport: (dataUrl: string, overlays: Overlay[]) => void;
  expose?: (
    fn: () => Promise<{ url: string; overlays: Overlay[] }>,
  ) => void;
}) {
  const [overlays, setOverlays] = createSignal<Overlay[]>([]);
  const [draggingId, setDraggingId] = createSignal<string | null>(null);
  const [startPos, setStartPos] = createSignal<[number, number] | null>(null);
  const [dragMode, setDragMode] = createSignal<
    "move" | "resize" | "rotate" | null
  >(null);
  const [startBBox, setStartBBox] = createSignal<
    [number, number, number, number] | null
  >(null);
  const [startRotation, setStartRotation] = createSignal(0);
  const [basePos, setBasePos] = createSignal<[number, number]>([0, 0]);
  const [baseSize, setBaseSize] = createSignal<[number, number]>([1, 1]);
  const [startBaseSize, setStartBaseSize] = createSignal<
    [number, number] | null
  >(null);
  const [isVideo, setIsVideo] = createSignal(false);
  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  const img = new Image();
  const ffmpeg = new FFmpeg();
  let videoData: Uint8Array | undefined;

  onMount(() => {
    if (props.expose) props.expose(exportMedia);
    const move = (e: PointerEvent) => pointerMove(e);
    const up = () => pointerUp();
    globalThis.addEventListener("pointermove", move);
    globalThis.addEventListener("pointerup", up);
    onCleanup(() => {
      globalThis.removeEventListener("pointermove", move);
      globalThis.removeEventListener("pointerup", up);
    });
  });

  createEffect(() => {
    if (props.mediaFile) {
      loadMedia(props.mediaFile);
    } else if (props.mediaUrl) {
      loadMedia(props.mediaUrl);
    }
  });

  async function loadMedia(source: string | File) {
    const url = typeof source === "string" ? source : source.name;
    if (
      url.match(/\.mp4$/) ||
      (typeof source !== "string" && source.type.startsWith("video"))
    ) {
      setIsVideo(true);
      if (!ffmpeg.loaded) {
        await ffmpeg.load();
      }
      let data: Uint8Array;
      if (typeof source === "string") {
        data = await fetchFile(source);
      } else {
        data = new Uint8Array(await source.arrayBuffer());
      }
      videoData = data;
      await ffmpeg.writeFile("in.mp4", data);
      await ffmpeg.exec([
        "-i",
        "in.mp4",
        "-frames:v",
        "1",
        "-vf",
        "scale=720:1280",
        "thumb.png",
      ]);
      const imgData = await ffmpeg.readFile("thumb.png");
      const blob = new Blob([imgData.buffer], { type: "image/png" });
      img.src = URL.createObjectURL(blob);
      img.onload = drawImage;
    } else {
      setIsVideo(false);
      if (typeof source === "string") {
        img.src = source;
      } else {
        img.src = URL.createObjectURL(source);
      }
      img.onload = drawImage;
    }
  }

  function pointerDown(
    id: string,
    e: PointerEvent,
    mode: "move" | "resize" = "move",
  ) {
    setDraggingId(id);
    setDragMode(e.ctrlKey ? "rotate" : mode);
    setStartPos([e.clientX, e.clientY]);
    const ov = overlays().find((v) => v.id === id);
    if (ov) {
      setStartBBox([...ov.bbox]);
      setStartRotation(ov.rotation || 0);
    }
    e.stopPropagation();
  }

  function basePointerDown(e: PointerEvent) {
    setDraggingId("base");
    setStartPos([e.clientX, e.clientY]);
    setStartBaseSize([...baseSize()]);
    const mode = (e.currentTarget as HTMLElement).dataset.mode as
      | "move"
      | "resize"
      | undefined;
    setDragMode(mode || "move");
  }

  function pointerMove(e: PointerEvent) {
    const id = draggingId();
    const start = startPos();
    const mode = dragMode();
    if (!id || !start || !containerRef || !mode) return;
    const dx = e.clientX - start[0];
    const dy = e.clientY - start[1];
    setStartPos([e.clientX, e.clientY]);
    const rect = containerRef.getBoundingClientRect();
    if (id === "base") {
      if (mode === "resize") {
        const sb = startBaseSize() || baseSize();
        const nw = Math.max(sb[0] + dx / rect.width, 0.2);
        const nh = Math.max(sb[1] + dy / rect.height, 0.2);
        setBaseSize([nw, nh]);
      } else {
        const nx = Math.min(Math.max(basePos()[0] + dx / rect.width, 0), 1);
        const ny = Math.min(Math.max(basePos()[1] + dy / rect.height, 0), 1);
        setBasePos([nx, ny]);
      }
    } else {
      setOverlays((prev) =>
        prev.map((ov) => {
          if (ov.id !== id) return ov;
          const sb = startBBox() || ov.bbox;
          if (mode === "resize") {
            const nw = Math.min(
              Math.max(sb[2] + dx / rect.width, 0.05),
              1 - sb[0],
            );
            const nh = Math.min(
              Math.max(sb[3] + dy / rect.height, 0.05),
              1 - sb[1],
            );
            return { ...ov, bbox: [sb[0], sb[1], nw, nh] };
          } else if (mode === "rotate") {
            return { ...ov, rotation: startRotation() + dx * 0.3 };
          } else {
            const nx = Math.min(
              Math.max(ov.bbox[0] + dx / rect.width, 0),
              1 - ov.bbox[2],
            );
            const ny = Math.min(
              Math.max(ov.bbox[1] + dy / rect.height, 0),
              1 - ov.bbox[3],
            );
            return { ...ov, bbox: [nx, ny, ov.bbox[2], ov.bbox[3]] };
          }
        })
      );
    }
    drawImage();
  }

  function pointerUp() {
    setDraggingId(null);
    setStartPos(null);
    setDragMode(null);
    setStartBBox(null);
    setStartBaseSize(null);
  }

  function drawImage() {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext("2d")!;
    canvasRef.width = 720;
    canvasRef.height = 1280;
    ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
    const [bx, by] = basePos();
    const [bw, bh] = baseSize();
    ctx.drawImage(
      img,
      bx * canvasRef.width,
      by * canvasRef.height,
      canvasRef.width * bw,
      canvasRef.height * bh,
    );
    ctx.fillStyle = "white";
    ctx.font = "24px sans-serif";
    overlays().forEach((ov) => {
      const x = ov.bbox[0] * canvasRef.width;
      const y = ov.bbox[1] * canvasRef.height;
      ctx.save();
      const cx = x + ov.bbox[2] * canvasRef.width / 2;
      const cy = y + ov.bbox[3] * canvasRef.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate(((ov.rotation || 0) * Math.PI) / 180);
      if (ov.kind === "image" && ov.src) {
        const imgEl = new Image();
        imgEl.src = ov.src;
        if (imgEl.complete) {
          ctx.drawImage(
            imgEl,
            -ov.bbox[2] * canvasRef.width / 2,
            -ov.bbox[3] * canvasRef.height / 2,
            ov.bbox[2] * canvasRef.width,
            ov.bbox[3] * canvasRef.height,
          );
        } else {
          imgEl.onload = () => drawImage();
        }
      } else {
        const text = ov.text || ov.kind;
        ctx.fillText(
          text,
          -ov.bbox[2] * canvasRef.width / 2,
          ov.bbox[3] * canvasRef.height / 2,
        );
      }
      ctx.restore();
    });
  }

  function addOverlay(
    kind: Overlay["kind"],
    opts?: { text?: string; src?: string },
  ) {
    const id = crypto.randomUUID();
    if (kind === "image" && opts?.src) {
      const imgEl = new Image();
      imgEl.src = opts.src;
      imgEl.onload = drawImage;
    }
    setOverlays([
      ...overlays(),
      {
        id,
        kind,
        text: opts?.text,
        src: opts?.src,
        bbox: [0.4, 0.4, 0.2, 0.1],
        rotation: 0,
      },
    ]);
    drawImage();
  }

  async function exportMedia(): Promise<{ url: string; overlays: Overlay[] }> {
    if (!canvasRef) return { url: "", overlays: [] };
    if (isVideo()) {
      if (!ffmpeg.loaded) {
        await ffmpeg.load();
      }
      if (videoData) {
        await ffmpeg.writeFile("in.mp4", videoData);
      }
      const [bx, by] = basePos();
      const base = `pad=720:1280:${Math.round(bx * 720)}:${
        Math.round(by * 1280)
      }`;
      const textFilter = overlays()
        .filter((ov) => ov.kind === "text")
        .map((ov) => {
          const text = ov.text || "";
          const rot = ((ov.rotation || 0) * Math.PI) / 180;
          return `drawtext=text='${text}':x=${Math.round(ov.bbox[0] * 720)}:y=${
            Math.round(ov.bbox[1] * 1280)
          }:fontsize=24:fontcolor=white:rotate=${rot}`;
        })
        .join(",");
      const filters = ["scale=720:1280", base];
      if (textFilter) filters.push(textFilter);
      const vf = filters.join(",");
      await ffmpeg.exec([
        "-i",
        "in.mp4",
        "-vf",
        vf,
        "-pix_fmt",
        "yuv420p",
        "out.mp4",
      ]);
      const data = await ffmpeg.readFile("out.mp4");
      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      props.onExport(url, overlays());
      return { url, overlays: overlays() };
    } else {
      drawImage();
      const url = canvasRef.toDataURL("image/png");
      props.onExport(url, overlays());
      return { url, overlays: overlays() };
    }
  }

  return (
    <div class="space-y-2">
      <div ref={containerRef!} class="relative w-full">
        <canvas
          ref={canvasRef!}
          class="border rounded w-full"
          onPointerDown={basePointerDown}
        />
        <div
          class="absolute bottom-0 right-0 w-3 h-3 bg-white cursor-se-resize"
          data-mode="resize"
          onPointerDown={basePointerDown}
        />
        <For each={overlays()}>
          {(ov) => (
            <div
              class="absolute border border-dashed text-white px-1 cursor-move select-none"
              style={{
                left: `${ov.bbox[0] * 100}%`,
                top: `${ov.bbox[1] * 100}%`,
                width: `${ov.bbox[2] * 100}%`,
                height: `${ov.bbox[3] * 100}%`,
                transform: `rotate(${ov.rotation || 0}deg)`,
              }}
              onPointerDown={(e) => pointerDown(ov.id, e)}
              contentEditable
              onBlur={(e) =>
                setOverlays((prev) =>
                  prev.map((v) =>
                    v.id === ov.id
                      ? { ...v, text: e.currentTarget.textContent || v.text }
                      : v
                  )
                )}
            >
              {ov.text || ov.kind}
              <div
                class="absolute bottom-0 right-0 w-3 h-3 bg-white cursor-se-resize"
                onPointerDown={(e) => pointerDown(ov.id, e, "resize")}
              />
            </div>
          )}
        </For>
      </div>
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
          class="px-2 py-1 bg-purple-700"
          onClick={() => addOverlay("text", { text: "テキスト" })}
        >
          テキスト
        </button>
        <input
          type="file"
          accept="image/*"
          multiple
          id="ovFile"
          class="hidden"
          onChange={(e) => {
            const files = (e.currentTarget as HTMLInputElement).files;
            if (!files) return;
            for (const file of files) {
              const url = URL.createObjectURL(file);
              addOverlay("image", { src: url });
            }
            (e.currentTarget as HTMLInputElement).value = "";
          }}
        />
        <button
          type="button"
          class="px-2 py-1 bg-yellow-700"
          onClick={() => document.getElementById("ovFile")!.click()}
        >
          画像追加
        </button>
        <button
          type="button"
          class="px-2 py-1 bg-gray-700"
          onClick={exportMedia}
        >
          Export
        </button>
      </div>
    </div>
  );
}
