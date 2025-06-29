// deno-lint-ignore-file
import { type Context } from "hono";
import z from "zod";
import { WebSocketManager } from "./websocketHandler.ts";

class EventManager {
  private events = new Map<
    string,
    {
      // deno-lint-ignore no-explicit-any
      schema: z.ZodSchema<any>;
      // deno-lint-ignore no-explicit-any
      handler: (c: Context, payload: any) => Promise<any>;
      permission?: string;
    }
  >();

  add<T>(
    identifier: string,
    eventId: string,
    schema: z.ZodSchema<T>,
    // deno-lint-ignore no-explicit-any
    handler: (c: Context, payload: T) => Promise<any>,
    permission?: string,
  ) {
    const key = `${identifier}:${eventId}`;
    this.events.set(key, { schema, handler, permission });
  }

  async dispatch(c: Context) {
    // JSON ボディを直接取得
    // deno-lint-ignore no-explicit-any
    const body = await c.req.json();
    // deno-lint-ignore no-explicit-any
    const events = (body as any).events as {
      eventId: string;
      identifier: string;
      payload: any;
    }[];

    const results: unknown[] = [];
    for (const e of events) {
      const key = `${e.identifier}:${e.eventId}`;
      const eventDef = this.events.get(key);

      if (!eventDef) {
        // Check if this is an extension-specific event that should be forwarded to the extension runtime
        if (e.identifier !== "takos") {
          try {
            console.log(`Looking for extension runtime for: ${e.identifier}`);
            const { callExtension, getExtension } = await import(
              "./utils/extensionsRuntime.ts"
            );
            const ext = getExtension(e.identifier);
            if (ext) {
              console.log(
                `Forwarding event ${e.eventId} to extension ${e.identifier} with payload:`,
                e.payload,
              );
              const result = await callExtension(e.identifier, e.eventId, [
                e.payload,
              ]);
              console.log(`Extension ${e.identifier} returned:`, result);
              results.push({ success: true, result });

              // WebSocketでイベントを配信
              const wsManager = WebSocketManager.getInstance();
              wsManager.distributeEvent(`${e.identifier}:${e.eventId}`, {
                identifier: e.identifier,
                eventId: e.eventId,
                payload: e.payload,
                result,
              });
              continue;
            } else {
              console.log(`Runtime not found for extension: ${e.identifier}`);
            }
          } catch (error) {
            console.error(
              `Error forwarding event to extension ${e.identifier}:`,
              error,
            );
            results.push({
              success: false,
              error: `Extension ${e.identifier} not found or error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            });
            continue;
          }
        }

        console.log(`No handler found for event: ${key}`);
        results.push({ error: "Invalid event", event: e });
        continue;
      }

      const parsed = eventDef.schema.safeParse(e.payload);
      if (!parsed.success) {
        results.push({ error: "Invalid payload", event: e });
        continue;
      }
      if (eventDef.permission) {
        const { getManifest } = await import("./utils/extensionsRuntime.ts");
        const manifest = getManifest(e.identifier) as
          | { permissions?: string[] }
          | undefined;
        if (!manifest?.permissions?.includes(eventDef.permission)) {
          results.push({ error: "Permission denied", event: e });
          continue;
        }
      }
      try {
        const result = await eventDef.handler(c, parsed.data);
        results.push({ success: true, result });

        // WebSocketでイベントを配信
        const wsManager = WebSocketManager.getInstance();
        wsManager.distributeEvent(`${e.identifier}:${e.eventId}`, {
          identifier: e.identifier,
          eventId: e.eventId,
          payload: parsed.data,
          result,
        });
      } catch (error) {
        console.error("Event handler error:", error);
        results.push({
          success: false,
          error: error instanceof Error
            ? error.message
            : "処理中にエラーが発生しました",
        });
      }
    }
    return c.json(results);
  }

  // Programmatically trigger an event
  async trigger(
    c: Context,
    identifier: string,
    eventId: string,
    payload: unknown,
  ): Promise<unknown> {
    const key = `${identifier}:${eventId}`;
    const eventDef = this.events.get(key);

    if (!eventDef) {
      if (identifier !== "takos") {
        const { callExtension, getExtension } = await import(
          "./utils/extensionsRuntime.ts"
        );
        const ext = getExtension(identifier);
        if (ext) return await callExtension(identifier, eventId, [payload]);
      }
      throw new Error(`Event not found: ${key}`);
    }

    const parsed = eventDef.schema.safeParse(payload);
    if (!parsed.success) throw new Error("Invalid payload");

    if (eventDef.permission) {
      const { getManifest } = await import("./utils/extensionsRuntime.ts");
      const manifest = getManifest(identifier) as
        | { permissions?: string[] }
        | undefined;
      if (!manifest?.permissions?.includes(eventDef.permission)) {
        throw new Error("Permission denied");
      }
    }

    return await eventDef.handler(c, parsed.data);
  }
}

export const eventManager = new EventManager();
