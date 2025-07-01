import { atom } from "solid-jotai";

export interface ExtensionMeta {
  identifier: string;
  name: string;
  icon?: string;
  version: string;
}

export const extensionListState = atom<ExtensionMeta[]>([]);
export const selectedExtensionState = atom<string | null>(null);
