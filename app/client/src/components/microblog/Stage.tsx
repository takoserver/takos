import { type Accessor, createSignal, onCleanup, Show } from "solid-js";
import type { ImageItem, StoryItem, TextItem, VideoItem } from "./types.ts";

interface DragInfo {
  mode: "move" | "resize" | "rotate";
  startX: number;
  startY: number;
  box: { x: number; y: number; w: number; h: number };
  rot: number;
  pointerId: number;
  target: HTMLElement;
}

export function Stage(props: {
  item: Accessor<StoryItem | null>;
  width: number;
  height: number;
  onChange: (item: StoryItem) => void;
  onRemove?: () => void;
}) {
  let container!: HTMLDivElement;
  const [drag, setDrag] = createSignal<DragInfo | null>(null);

  const toPoint = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const clamp = (v: number, min = 0, max = 1) =>
    Math.min(max, Math.max(min, v));

  const onMove = (e: PointerEvent) => {
    const info = drag();
    const current = props.item();
    if (!info || !current) return;
    const p = toPoint(e);
    const dx = p.x - info.startX;
    const dy = p.y - info.startY;
    if (info.mode === "move") {
      const nx = clamp(info.box.x + dx, 0, 1 - info.box.w);
      const ny = clamp(info.box.y + dy, 0, 1 - info.box.h);
      props.onChange({ ...current, bbox: { ...current.bbox, x: nx, y: ny } });
    } else if (info.mode === "resize") {
      const nw = clamp(info.box.w + dx, 0.05, 1 - info.box.x);
      const nh = clamp(info.box.h + dy, 0.05, 1 - info.box.y);
      props.onChange({ ...current, bbox: { ...current.bbox, w: nw, h: nh } });
    } else if (info.mode === "rotate") {
      const cx = info.box.x + info.box.w / 2;
      const cy = info.box.y + info.box.h / 2;
      const angle = Math.atan2(p.y - cy, p.x - cx);
      const startA = Math.atan2(info.startY - cy, info.startX - cx);
      const rot = (info.rot + (angle - startA) * (180 / Math.PI)) % 360;
      props.onChange({ ...current, rotation: rot });
    }
  };

  const endDrag = () => {
    const info = drag();
    if (info) info.target.releasePointerCapture(info.pointerId);
    setDrag(null);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", endDrag);
  };

  const startDrag = (e: PointerEvent, mode: DragInfo["mode"]) => {
    e.preventDefault();
    e.stopPropagation();
    const it = props.item();
    if (!it) return;
    const p = toPoint(e);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    setDrag({
      mode,
      startX: p.x,
      startY: p.y,
      box: { ...it.bbox },
      rot: it.rotation ?? 0,
      pointerId: e.pointerId,
      target,
    });
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", endDrag);
  };

  onCleanup(endDrag);

  const renderItem = (item: StoryItem) => {
    if (item.type === "story:ImageItem") {
      const i = item as ImageItem;
      return <img src={i.media.href} class="w-full h-full object-cover" />;
    }
    if (item.type === "story:VideoItem") {
      const v = item as VideoItem;
      return (
        <video
          src={v.media.href}
          muted={v.muted}
          loop={v.loop}
          autoplay={v.autoplay}
          class="w-full h-full object-cover"
        />
      );
    }
    const t = item as TextItem;
    const style = t.style as Record<string, unknown> | undefined;
    return (
      <div
        style={`width:100%;height:100%;color:${
          style?.color || "#fff"
        };font-size:${
          (style?.fontSize ?? 0.06) * 100
        }vmin;display:flex;align-items:center;justify-content:center;text-align:${
          style?.align || "center"
        };overflow:hidden;word-break:break-word;`}
      >
        {t.text}
      </div>
    );
  };

  return (
    <div
      ref={(el) => (container = el)}
      class="relative"
      style={`width:${props.width}px;height:${props.height}px;background:#000;touch-action:none`}
    >
      <Show when={props.item()}>
        {(it) => {
          const box = it().bbox;
          const rot = it().rotation ?? 0;
          const style = {
            left: `${box.x * 100}%`,
            top: `${box.y * 100}%`,
            width: `${box.w * 100}%`,
            height: `${box.h * 100}%`,
            transform: `rotate(${rot}deg)`,
            "transform-origin": "center",
          } as const;
          return (
            <>
              <div
                class="absolute overflow-hidden pointer-events-none"
                style={style}
              >
                {renderItem(it())}
              </div>
              <div
                class="absolute border border-white/50 border-dashed box-border"
                style={style}
                onPointerDown={(e) => startDrag(e, "move")}
              />
              <button
                type="button"
                class="absolute w-5 h-5 text-white bg-black/50 flex items-center justify-center rounded-full"
                style={{
                  left: `${box.x * 100 - 2.5}%`,
                  top: `${box.y * 100 - 2.5}%`,
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => props.onRemove?.()}
              >
                ×
              </button>
              <div
                class="absolute w-4 h-4 bg-white border border-black rounded-full cursor-nwse-resize"
                style={{
                  left: `${(box.x + box.w) * 100 - 2}%`,
                  top: `${(box.y + box.h) * 100 - 2}%`,
                }}
                onPointerDown={(e) => startDrag(e, "resize")}
              />
              <div
                class="absolute w-4 h-4 bg-white border border-black rounded-full cursor-crosshair"
                style={{
                  left: `${box.x * 100 + box.w * 50 - 2}%`,
                  top: `${box.y * 100 - 4}%`,
                }}
                onPointerDown={(e) => startDrag(e, "rotate")}
              />
            </>
          );
        }}
      </Show>
    </div>
  );
}
