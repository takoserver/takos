export interface MicroblogPost {
  id: string;
  content: string;
  userName: string;
  displayName: string;
  authorAvatar?: string;
  createdAt: string;
  likes: number;
  retweets: number;
  replies: number;
  isLiked?: boolean;
  isRetweeted?: boolean;
  images?: string[];
  attachments?: { url: string; type: "image" | "video" | "audio" }[];
  hashtags?: string[];
  mentions?: string[];
  parentId?: string; // 返信の場合の親投稿ID
  quoteId?: string; // 引用元投稿ID
  domain?: string;
}

export interface Story {
  id: string;
  author: string;
  aspectRatio?: string;
  pages: StoryPage[];
  expiresAt?: string;
  poster?: MediaLink;
  audioTrack?: { href: string; start?: number; gain?: number };
  createdAt: string;
  views: number;
  isViewed?: boolean;
}

export interface MediaLink {
  type: string;
  href: string;
  mediaType?: string;
}

export interface StoryPage {
  type: "story:Page";
  duration?: number;
  background?: Record<string, unknown>;
  safeArea?: { top: number; bottom: number; left: number; right: number };
  items: StoryItem[];
}

export type StoryItem = ImageItem | VideoItem | TextItem;

export interface BaseItem {
  bbox: { x: number; y: number; w: number; h: number; units: string };
  rotation?: number;
  zIndex?: number;
  opacity?: number;
  anchor?: string;
  visibleFrom?: number;
  visibleUntil?: number;
  tapAction?: { type: string; href?: string; target?: string };
  contentWarning?: string;
  accessibilityLabel?: string;
}

export interface ImageItem extends BaseItem {
  type: "story:ImageItem";
  media: MediaLink;
  crop?: Record<string, unknown>;
  filters?: { name: string; value: number }[];
  alt?: string;
}

export interface VideoItem extends BaseItem {
  type: "story:VideoItem";
  media: MediaLink;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  trim?: { start: number; end: number };
  poster?: MediaLink;
}

export interface TextItem extends BaseItem {
  type: "story:TextItem";
  text: string;
  style?: Record<string, unknown>;
  rtl?: boolean;
  mentions?: Record<string, unknown>[];
}

export interface Note {
  id: string;
  content: string;
  userName: string;
  displayName: string;
  authorAvatar?: string;
  createdAt: string;
  likes: number;
  comments: number;
  isLiked?: boolean;
  images?: string[];
  isPinned?: boolean;
  domain?: string;
}

/**
 * ActivityPub Object 汎用型
 */
export interface ActivityPubObject {
  id: string;
  type: string; // Note, Image, Article, Story など
  attributedTo: string;
  content?: string;
  to?: string[];
  cc?: string[];
  published: string;
  // deno-lint-ignore no-explicit-any
  extra?: Record<string, any>;
}

export function noteToPost(note: Note): MicroblogPost {
  return {
    id: note.id,
    content: note.content,
    userName: note.userName,
    displayName: note.displayName,
    authorAvatar: note.authorAvatar,
    createdAt: note.createdAt,
    likes: note.likes,
    retweets: 0, // Noteにretweetはない
    replies: note.comments,
    isLiked: note.isLiked,
    isRetweeted: false,
    domain: note.domain,
    // attachmentsやquoteIdなど、Noteにないものはデフォルト値を設定
  };
}
