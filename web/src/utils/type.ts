import { Accessor, createSignal, Setter } from "solid-js";
import { MasterKey,} from "@takos/takos-encrypt-ink"
type Signal<T> = {
  accessor: Accessor<T>;
  setter: Setter<T>;
};
export type AppState = {
  load: Signal<"loading" | "loaded" | "error">;
  websocket: Signal<WebSocket | null>;
  roomsData: Signal<[string, { roomType: string; talkData: {
    messageid: string;
    message: string;
    userId: string;
    timestamp: string;
    timestampOriginal: string;
    read: boolean;
    type: string;
    verify: number;
    identityKeyHashHex: string;
    masterKeyHashHex: string;
    roomKeyHashHex: string;
  }[] }]>;
  selectedRoom: Signal<string | null>;
  page: Signal<string>
  inputMessage: Signal<string>;
  MasterKey: Signal<MasterKey>
};