import { z } from "zod";

// ---------- Types ----------
export type OverlayType = "Text" | "Mention" | "Hashtag" | "Link";

export interface OverlayBase {
  type: OverlayType;
  x: number;
  y: number;
  w: number;
  h: number; // 0..1 相対座標
  style?: Record<string, string | number>;
}
export interface TextOverlay extends OverlayBase {
  type: "Text";
  content: string;
}
export interface MentionOverlay extends OverlayBase {
  type: "Mention";
  href: string;
}
export interface HashtagOverlay extends OverlayBase {
  type: "Hashtag";
  name: string;
}
export interface LinkOverlay extends OverlayBase {
  type: "Link";
  link: string;
}
export type Overlay =
  | TextOverlay
  | MentionOverlay
  | HashtagOverlay
  | LinkOverlay;

export type MediaKind = "Image" | "Video" | "Audio";
export interface StoryMedia {
  type: MediaKind;
  url: string;
  mediaType: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface StoryItem {
  type: "StoryItem";
  media: StoryMedia;
  duration?: number; // 秒（動画は media.duration 優先）
  alt?: string;
  overlays?: Overlay[];
}

export type StoryType = "image" | "video" | "mix";
export interface StoryDoc {
  _id: string; // DB 内部 ID
  id: string; // 公開 IRI
  actor: string; // actor IRI
  items: StoryItem[];
  published: Date;
  expiresAt: Date;
  storyType: StoryType;
  to: string[];
  cc?: string[];
  bto?: string[];
  bcc?: string[];
  fallback?: StoryMedia;
  viewCount?: number; // ローカルのみ
  archived?: boolean;
  highlightOf?: string | null;
}

// ---------- Zod Schemas (validate inbox/outbox payloads) ----------
const overlayBase = z.object({
  type: z.enum(["Text", "Mention", "Hashtag", "Link"]),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
  style: z.record(z.union([z.string(), z.number()])).optional(),
});
export const zTextOverlay = overlayBase.extend({
  type: z.literal("Text"),
  content: z.string().min(1),
});
export const zMentionOverlay = overlayBase.extend({
  type: z.literal("Mention"),
  href: z.string().url(),
});
export const zHashtagOverlay = overlayBase.extend({
  type: z.literal("Hashtag"),
  name: z.string().min(1),
});
export const zLinkOverlay = overlayBase.extend({
  type: z.literal("Link"),
  link: z.string().url(),
});
export const zOverlay = z.discriminatedUnion("type", [
  zTextOverlay,
  zMentionOverlay,
  zHashtagOverlay,
  zLinkOverlay,
]);

export const zMedia = z.object({
  type: z.enum(["Image", "Video", "Audio"]),
  url: z.string().url(),
  mediaType: z.string().min(3),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().positive().optional(),
});

export const zStoryItem = z.object({
  type: z.literal("StoryItem"),
  media: zMedia,
  duration: z.number().positive().optional(),
  alt: z.string().optional(),
  overlays: z.array(zOverlay).optional(),
});

export const zStoryObject = z.object({
  "@context": z.any().optional(),
  id: z.string().url().optional(),
  type: z.literal("Story"),
  attributedTo: z.string().url(),
  published: z.string().datetime(),
  expiresAt: z.string().datetime(),
  storyType: z.enum(["image", "video", "mix"]),
  items: z.array(zStoryItem).min(1),
  fallback: zMedia.optional(),
  to: z.array(z.string().url()).default([]),
  cc: z.array(z.string().url()).optional(),
  bto: z.array(z.string().url()).optional(),
  bcc: z.array(z.string().url()).optional(),
});
