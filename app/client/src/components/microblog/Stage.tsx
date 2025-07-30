import { createSignal, For, onCleanup } from "solid-js";
import type {
  ImageItem,
  StoryItem,
  StoryPage,
  TextItem,
  VideoItem,
} from "./types.ts";

export function Stage(props: {
  page: StoryPage;
  width: number;
  height: number;
  selectedIndex: number | null;
  onSelect: (i: number) => void;
  updateItem: (i: number, item: StoryItem) => void;
}) {
  let svg!: SVGSVGElement;
  const [drag, setDrag] = createSignal<
    {
      idx: number;
      mode: "move" | "resize" | "rotate";
      startX: number;
      startY: number;
      box: { x: number; y: number; w: number; h: number };
      rot: number;
    } | null
  >(null);

  const toPoint = (e: PointerEvent) => {
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    return { x, y };
  };

  const clamp = (v: number, min = 0, max = 1) =>
    Math.min(max, Math.max(min, v));

  const onMove = (e: PointerEvent) => {
    const d = drag();
    if (!d) return;
    const p = toPoint(e);
    const dx = p.x - d.startX;
    const dy = p.y - d.startY;
    const item = props.page.items[d.idx];
    if (d.mode === "move") {
      const nx = clamp(d.box.x + dx, 0, 1 - d.box.w);
      const ny = clamp(d.box.y + dy, 0, 1 - d.box.h);
      props.updateItem(d.idx, {
        ...item,
        bbox: { ...item.bbox, x: nx, y: ny },
      });
    } else if (d.mode === "resize") {
      const nw = clamp(d.box.w + dx, 0.05, 1 - d.box.x);
      const nh = clamp(d.box.h + dy, 0.05, 1 - d.box.y);
      props.updateItem(d.idx, {
        ...item,
        bbox: { ...item.bbox, w: nw, h: nh },
      });
    } else if (d.mode === "rotate") {
      const cx = d.box.x + d.box.w / 2;
      const cy = d.box.y + d.box.h / 2;
      const angle = Math.atan2(p.y - cy, p.x - cx);
      const startA = Math.atan2(d.startY - cy, d.startX - cx);
      const rot = (d.rot + (angle - startA) * (180 / Math.PI)) % 360;
      props.updateItem(d.idx, { ...item, rotation: rot });
    }
  };

  const onUp = () => {
    setDrag(null);
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
  };

  const startDrag = (
    e: PointerEvent,
    idx: number,
    mode: "move" | "resize" | "rotate",
  ) => {
    e.stopPropagation();
    props.onSelect(idx);
    const p = toPoint(e);
    const it = props.page.items[idx];
    setDrag({
      idx,
      mode,
      startX: p.x,
      startY: p.y,
      box: { ...it.bbox },
      rot: it.rotation ?? 0,
    });
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  onCleanup(onUp);

  const renderItem = (item: StoryItem) => {
    if (item.type === "story:ImageItem") {
      const i = item as ImageItem;
      return (
        <image
          href={i.media.href}
          x="0"
          y="0"
          width="1"
          height="1"
          preserveAspectRatio="xMidYMid slice"
        />
      );
    }
    if (item.type === "story:VideoItem") {
      const v = item as VideoItem;
      return (
        <foreignObject x="0" y="0" width="1" height="1">
          <video
            src={v.media.href}
            muted={v.muted}
            loop={v.loop}
            autoplay={v.autoplay}
            style="width:100%;height:100%;object-fit:cover"
          />
        </foreignObject>
      );
    }
    const t = item as TextItem;
    const style = t.style as Record<string, unknown> | undefined;
    return (
      <foreignObject x="0" y="0" width="1" height="1">
        <div
          style={`width:100%;height:100%;color:${
            style?.color || "#fff"
          };font-size:${
            (style?.fontSize ?? 0.06) * 100
          }vmin;display:flex;align-items:center;justify-content:center;text-align:${
            style?.align || "center"
          }`}
        >
          {t.text}
        </div>
      </foreignObject>
    );
  };

  return (
    <svg
      ref={svg}
      viewBox="0 0 1 1"
      width={props.width}
      height={props.height}
      style="background:#000;touch-action:none"
      onPointerDown={() => props.onSelect(-1)}
    >
      <For
        each={[...props.page.items].sort((a, b) =>
          (a.zIndex ?? 0) - (b.zIndex ?? 0)
        )}
      >
        {(item, i) => {
          const idx = i();
          const box = item.bbox;
          const rot = item.rotation ?? 0;
          const trans = `translate(${box.x} ${box.y}) rotate(${rot} ${
            box.w / 2
          } ${box.h / 2}) scale(${box.w} ${box.h})`;
          return (
            <g
              transform={trans}
              opacity={item.opacity ?? 1}
              onPointerDown={(e) => startDrag(e, idx, "move")}
            >
              {renderItem(item)}
              {props.selectedIndex === idx && (
                <g>
                  <rect
                    x="0"
                    y="0"
                    width="1"
                    height="1"
                    fill="none"
                    stroke="#4ade80"
                    stroke-width="0.003"
                  />
                  <circle
                    cx="1"
                    cy="1"
                    r="0.02"
                    fill="#4ade80"
                    onPointerDown={(e) => startDrag(e, idx, "resize")}
                  />
                  <circle
                    cx="0.5"
                    cy="-0.05"
                    r="0.02"
                    fill="#4ade80"
                    onPointerDown={(e) => startDrag(e, idx, "rotate")}
                  />
                </g>
              )}
            </g>
          );
        }}
      </For>
    </svg>
  );
}
