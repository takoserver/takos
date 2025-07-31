import { StoryCanvasState } from "./state.ts";

export function toActivityStreams(
  state: StoryCanvasState,
  blobUrl: string,
): Record<string, unknown> {
  const objectId = crypto.randomUUID();
  const overlays = state.semanticOverlays.map((o) => ({
    id: o.id,
    kind: o.kind,
    ref: o.ref,
    bbox: o.bbox,
    rotation: o.rotation,
    z: o.z,
    style: o.style,
    tapAction: o.tapAction,
  }));

  const obj: Record<string, unknown> = {
    "@context": ["https://www.w3.org/ns/activitystreams", {
      "x": "https://example.com/ns#",
    }],
    id: objectId,
    type: [state.baseMedia.kind === "image" ? "Image" : "Video", "x:Story"],
    mediaType: state.baseMedia.kind === "image" ? "image/webp" : "video/mp4",
    url: {
      type: "Link",
      href: blobUrl,
      width: 1080,
      height: 1920,
    },
    published: new Date().toISOString(),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    "x:overlays": overlays,
  };

  return {
    type: "Create",
    object: obj,
  } as Record<string, unknown>;
}
