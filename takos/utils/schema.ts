import { z } from "zod";

export const passwordSchema = z.string().min(8).max(100);

export const userNameSchema = z.string().min(3).max(20).regex(
  /^[a-zA-Z0-9_]+$/,
);

export const emailSchema = z.string().email();

export const groupPermissionsSchema = z.array(z.union([
  z.literal(`ADMIN`),
  z.literal(`VIEW_CHANNEL`),
  z.literal("MANAGE_ROLL"),
  z.literal("MANAGE_CHANNEL"),
  z.literal("MANAGE_SERVER"),
  z.literal("VIEW_LOG"),
  z.literal("KICK_USER"),
  z.literal("BAN_USER"),
  z.literal("INVITE_USER"),
  z.literal("ACCEPT_JOIN"),
  z.literal("READ_MESSAGE"),
  z.literal("SEND_MESSAGE"),
  z.literal("MENTION_USER"),
  z.literal("MANAGE_MESSAGE"),
  z.literal("CONNECT_VOICE"),
  z.literal("SPEAK_VOICE"),
  z.literal("KICK_USER"),
]));
