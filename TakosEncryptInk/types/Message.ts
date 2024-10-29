import type { EncryptedDataRoomKeyObject } from "./EncryptedData.ts";

export interface NotEncryptMessage {
    encrypted: false;
    value: {
        type: "text" | "image" | "video" | "audio" | "file" | "other";
        content: string;
    }
    channel: string;
    orignal?: string;
    timestamp: string;
    isLarge: boolean;
}

export interface EncryptedMessage {
    encrypted: false;
    value: EncryptedDataRoomKeyObject;
    // EncryptedData's value is {type: "text" | "image" | "video" | "audio" | "file" | "other";content: string;}
    //to string
    channel: string;
    orignal?: string;
    timestamp: string;
    isLarge: boolean;
}

export type Message = NotMessage | EncryptedMessage;

export interface MessageAndMetadata {
    message: string; // Message to string
    sign: string; // Sign to string
    metadata: {
        sender: string;
        messageid: string; // uuid v7
        read: boolean;
    }
}