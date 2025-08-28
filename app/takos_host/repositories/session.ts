import { createDB } from "@takos_host/db";
import type { HostDataStore, HostSession } from "../db/types.ts";

const getDB = (): HostDataStore => createDB({}) as HostDataStore;

export type HostSessionData = HostSession;

export async function findHostSessionById(
  sessionId: string,
): Promise<HostSessionData | null> {
  const db = getDB();
  return await db.hostSessions.findById(sessionId);
}

export async function createHostSession(
  sessionId: string,
  expiresAt: Date,
  user: string,
): Promise<HostSessionData> {
  const db = getDB();
  return await db.hostSessions.create(sessionId, user, expiresAt);
}

export async function updateHostSession(
  sessionId: string,
  expiresAt: Date,
): Promise<void> {
  const db = getDB();
  await db.hostSessions.updateExpires(sessionId, expiresAt);
}
