export interface DrawableLayer {
  id: string;
  kind: "image" | "video" | "text" | "draw" | "shape";
  bbox: [number, number, number, number];
  rotation: number;
  opacity: number;
  payload: unknown;
  z: number;
}

export interface SemanticOverlay {
  id: string;
  kind: "mention" | "place" | "question" | "link";
  ref: string;
  bbox: [number, number, number, number];
  rotation: number;
  z: number;
  style?: Record<string, unknown>;
  tapAction?: string;
}

export interface StoryCanvasState {
  baseMedia: {
    kind: "image" | "video";
    url: string;
    width: number;
    height: number;
    duration?: number;
  };
  drawableLayers: DrawableLayer[];
  semanticOverlays: SemanticOverlay[];
  aspectRatio: number;
  history: DrawableLayer[][];
}

export function createInitialState(
  mediaUrl: string,
  width: number,
  height: number,
): StoryCanvasState {
  return {
    baseMedia: { kind: "image", url: mediaUrl, width, height },
    drawableLayers: [],
    semanticOverlays: [],
    aspectRatio: 9 / 16,
    history: [],
  };
}
