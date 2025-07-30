export type Mat = [number, number, number, number, number, number];
export type LayerType = "image" | "text" | "video";

export interface BaseLayer {
  id: string;
  layerType: LayerType;
  transform: Mat;
  z?: number;
  opacity?: number;
  startOffset?: number;
  endOffset?: number;
  alt?: string;
}

export interface ImageLayer extends BaseLayer {
  layerType: "image";
  media: string;
  focalPoint?: [number, number];
}

export interface TextLayer extends BaseLayer {
  layerType: "text";
  text: string;
  fontFamily?: string;
  fontWeight?: number | string;
  fontSize?: number;
  lineHeight?: number;
  color?: string;
  textAlign?: "left" | "center" | "right";
  background?: string;
  stroke?: { color: string; width: number };
  shadow?: { blur: number; dx: number; dy: number; color: string };
}

export type Layer = ImageLayer | TextLayer;

export interface StoryItem {
  id: string;
  duration: number;
  layers: Layer[];
  readingOrder?: string[];
}

export interface Story {
  id: string;
  storyParts: StoryItem[];
  expiresAt?: string;
  attachment?: { type: "Image" | "Video"; url: string; mediaType?: string }[];
  summary?: string;
}
