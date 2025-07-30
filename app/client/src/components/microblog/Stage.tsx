import { type Accessor, createSignal, onCleanup, Show } from "solid-js";
import type { ImageItem, StoryItem, TextItem, VideoItem } from "./types.ts";

export function Stage(props: {
  item: Accessor<StoryItem | null>;
  width: number;
  height: number;
  onChange: (item: StoryItem) => void;
  onRemove?: () => void;
}) {
  let container!: HTMLDivElement;
  const [drag, setDrag] = createSignal<
    {
      mode: "move" | "resize" | "rotate";
      startX: number;
      startY: number;
      box: { x: number; y: number; w: number; h: number };
      rot: number;
      id: number;
      target: HTMLElement | null;
    } | null
  >(null);

  const toPoint = (e: PointerEvent) => {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x, y };
  };

  const clamp = (v: number, min = 0, max = 1) =>
    Math.min(max, Math.max(min, v));

  const onMove = (e: PointerEvent) => {
    const d = drag();
    const current = props.item();
    if (!d || !current) return;
    const p = toPoint(e);
    const dx = p.x - d.startX;
    const dy = p.y - d.startY;
    const item = current;
    if (d.mode === "move") {
      const nx = clamp(d.box.x + dx, 0, 1 - d.box.w);
      const ny = clamp(d.box.y + dy, 0, 1 - d.box.h);
      props.onChange({ ...item, bbox: { ...item.bbox, x: nx, y: ny } });
    } else if (d.mode === "resize") {
      const nw = clamp(d.box.w + dx, 0.05, 1 - d.box.x);
      const nh = clamp(d.box.h + dy, 0.05, 1 - d.box.y);
      props.onChange({ ...item, bbox: { ...item.bbox, w: nw, h: nh } });
    } else if (d.mode === "rotate") {
      const cx = d.box.x + d.box.w / 2;
      const cy = d.box.y + d.box.h / 2;
      const angle = Math.atan2(p.y - cy, p.x - cx);
      const startA = Math.atan2(d.startY - cy, d.startX - cx);
      const rot = (d.rot + (angle - startA) * (180 / Math.PI)) % 360;
      props.onChange({ ...item, rotation: rot });
    }
  };

  const onUp = () => {
    const d = drag();
    if (d?.target) {
      d.target.releasePointerCapture?.(d.id);
    }
    setDrag(null);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
  };

  const startDrag = (
    e: PointerEvent,
    mode: "move" | "resize" | "rotate",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const tgt = e.currentTarget as HTMLElement;
    tgt.setPointerCapture?.(e.pointerId);
    const it = props.item();
    if (!it) return;
    const p = toPoint(e);
    setDrag({
      mode,
      startX: p.x,
      startY: p.y,
      box: { ...it.bbox },
      rot: it.rotation ?? 0,
      id: e.pointerId,
      target: tgt,
    });
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  onCleanup(onUp);

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
      class="relative cursor-move"
      style={`width:${props.width}px;height:${props.height}px;background:#000;touch-action:none`}
      onPointerDown={(e) => startDrag(e, "move")}
    >
      <Show when={props.item()}>
        {(item) => {
          const box = item().bbox;
          const rot = item().rotation ?? 0;
          const boxStyle = {
            left: `${box.x * 100}%`,
            top: `${box.y * 100}%`,
            width: `${box.w * 100}%`,
            height: `${box.h * 100}%`,
            transform: `rotate(${rot}deg)`,
            "transform-origin": "center",
            opacity: item().opacity ?? 1,
          } as const;
          return (
            <>
              <div
                class="absolute overflow-hidden pointer-events-none"
                style={boxStyle}
              >
                {renderItem(item())}
              </div>
              <div
                class="absolute border border-white/50 border-dashed box-border"
                style={{
                  left: `${box.x * 100}%`,
                  top: `${box.y * 100}%`,
                  width: `${box.w * 100}%`,
                  height: `${box.h * 100}%`,
                  transform: `rotate(${rot}deg)`,
                }}
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
