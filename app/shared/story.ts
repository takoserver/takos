export interface StoryItemBase {
  type: string;
  bbox?: { x: number; y: number; w: number; h: number; units?: string };
  rotation?: number;
  zIndex?: number;
  opacity?: number;
  transform?: string;
  anchor?: string;
  visibleFrom?: number;
  visibleUntil?: number;
  tapAction?: { type: string; href?: string; target?: string };
  contentWarning?: string;
  accessibilityLabel?: string;
}

export interface ImageItem extends StoryItemBase {
  type: "story:ImageItem";
  media: { type: string; href: string; mediaType?: string };
  crop?: {
    shape?: string;
    radius?: number;
    focusX?: number;
    focusY?: number;
  };
  filters?: { name: string; value: number }[];
  alt?: string;
}

export interface VideoItem extends StoryItemBase {
  type: "story:VideoItem";
  media: { type: string; href: string; mediaType?: string };
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  trim?: { start?: number; end?: number };
  poster?: { type: string; href: string; mediaType?: string };
}

export interface TextItem extends StoryItemBase {
  type: "story:TextItem";
  text: string;
  style?: {
    fontFamily?: string;
    fontWeight?: number;
    fontSize?: number;
    lineHeight?: number;
    align?: string;
    color?: string;
    stroke?: { color: string; width: number };
    shadow?: unknown;
    background?: unknown;
    padding?: number;
  };
  rtl?: boolean;
  mentions?: unknown[];
}

export type StoryItem = ImageItem | VideoItem | TextItem | StoryItemBase;

export interface StoryPage {
  type: "story:Page";
  duration?: number;
  background?: unknown;
  safeArea?: { top: number; bottom: number; left: number; right: number };
  items: StoryItem[];
}

export interface StoryData {
  aspectRatio?: string;
  pages: StoryPage[];
  expiresAt?: string;
  poster?: { type: string; url: string; mediaType?: string };
  audioTrack?: { href: string; start?: number; gain?: number };
}
