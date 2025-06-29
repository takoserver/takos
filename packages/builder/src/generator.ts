import type {
  ActivityPubConfig,
  ModuleAnalysis,
  TypeGenerationOptions,
  TypeGenerationResult,
  VirtualEntry,
} from "./types.ts";

export class VirtualEntryGenerator {
  generateServerEntry(analyses: ModuleAnalysis[]): VirtualEntry {
    const lines: string[] = [];
    const exports: string[] = [];
    let idx = 0;
    for (const a of analyses) {
      const modVar = `mod${idx++}`;
      lines.push(`import * as ${modVar} from '${a.filePath}';`);
      for (const tag of a.jsDocTags || []) {
        if (tag.tag === "event") {
          const name = this.extractEventName(tag.value);
          if (name) {
            lines.push(
              `export const ${name} = (...args: any[]) => ${modVar}.${tag.targetFunction}(...args);`,
            );
            exports.push(name);
          }
        }
      }
    }
    return { type: "server", exports, imports: [], content: lines.join("\n") };
  }

  generateClientEntry(analyses: ModuleAnalysis[]): VirtualEntry {
    const lines: string[] = [];
    const exports: string[] = [];
    let idx = 0;
    for (const a of analyses) {
      const modVar = `mod${idx++}`;
      lines.push(`import * as ${modVar} from '${a.filePath}';`);
      for (const tag of a.jsDocTags || []) {
        if (tag.tag === "event") {
          const name = this.extractEventName(tag.value);
          if (name) {
            lines.push(
              `export const ${name} = (...args: any[]) => ${modVar}.${tag.targetFunction}(...args);`,
            );
            exports.push(name);
          }
        }
      }
    }
    return { type: "client", exports, imports: [], content: lines.join("\n") };
  }

  generateTypeDefinitions(
    options: TypeGenerationOptions,
  ): TypeGenerationResult {
    const lines: string[] = [];

    lines.push("// Auto-generated TypeScript definitions for Takos Extension");
    lines.push("// DO NOT EDIT MANUALLY");
    lines.push("// Generated at: " + new Date().toISOString());
    lines.push("");

    // Core API types
    lines.push("export interface TakosEvent<T = unknown> {");
    lines.push("  name: string;");
    lines.push("  payload: T;");
    lines.push("  timestamp: number;");
    lines.push("  source: 'server' | 'client' | 'ui' | 'background';");
    lines.push("}");
    lines.push("");

    lines.push("export interface TakosEventsAPI {");
    lines.push("  request(name: string, payload: unknown): Promise<unknown>;");
    lines.push(
      "  onRequest(name: string, handler: (payload: unknown) => unknown | Promise<unknown>): () => void;",
    );
    lines.push("}");
    lines.push("");

    lines.push("export interface TakosKVAPI {");
    lines.push("  read(key: string): Promise<unknown>;");
    lines.push("  write(key: string, value: unknown): Promise<void>;");
    lines.push("  delete(key: string): Promise<void>;");
    lines.push("  list(prefix?: string): Promise<string[]>;");
    lines.push("}");
    lines.push("");

    lines.push("export interface TakosCdnAPI {");
    lines.push("  read(path: string): Promise<string>;");
    lines.push(
      "  write(path: string, data: string | Uint8Array, options?: { cacheTTL?: number }): Promise<string>;",
    );
    lines.push("  delete(path: string): Promise<void>;");
    lines.push("  list(prefix?: string): Promise<string[]>;");
    lines.push("}");
    lines.push("");

    lines.push("export interface TakosActivityPubAPI {");
    lines.push("  currentUser(): Promise<string>;");
    lines.push("  send(activity: Record<string, unknown>): Promise<void>;");
    lines.push("  read(id: string): Promise<Record<string, unknown>>;");
    lines.push("  delete(id: string): Promise<void>;");
    lines.push("  list(): Promise<string[]>;");
    lines.push(
      "  follow(followerId: string, followeeId: string): Promise<void>;",
    );
    lines.push(
      "  unfollow(followerId: string, followeeId: string): Promise<void>;",
    );
    lines.push(
      "  listFollowers(actorId: string): Promise<string[]>;",
    );
    lines.push(
      "  listFollowing(actorId: string): Promise<string[]>;",
    );
    lines.push("  actor: {");
    lines.push("    read(): Promise<Record<string, unknown>>;");
    lines.push("    update(key: string, value: string): Promise<void>;");
    lines.push("    delete(key: string): Promise<void>;");
    lines.push("  };\n  pluginActor: {");
    lines.push(
      "    create(localName: string, profile: Record<string, unknown>): Promise<string>;",
    );
    lines.push("    read(iri: string): Promise<Record<string, unknown>>;");
    lines.push(
      "    update(iri: string, partial: Record<string, unknown>): Promise<void>;",
    );
    lines.push("    delete(iri: string): Promise<void>;");
    lines.push("    list(): Promise<string[]>;\n  };\n}");
    lines.push("");

    lines.push("export interface Extension {");
    lines.push("  identifier: string;");
    lines.push("  version: string;");
    lines.push("  isActive: boolean;");
    lines.push("  request(name: string, payload?: unknown): Promise<unknown>;");
    lines.push("}");
    lines.push("");

    lines.push("export interface TakosExtensionsAPI {");
    lines.push("  get(identifier: string): Extension | undefined;");
    lines.push("  all: Extension[];");
    lines.push(
      "  onRequest(name: string, handler: (payload: unknown) => unknown | Promise<unknown>): () => void;",
    );
    lines.push("}");
    lines.push("");

    lines.push("export interface TakosServerAPI {");
    lines.push("  kv: TakosKVAPI;");
    lines.push("  ap: TakosActivityPubAPI;");
    lines.push("  cdn: TakosCdnAPI;");
    lines.push("  events: TakosEventsAPI;");
    lines.push("  extensions: TakosExtensionsAPI;");
    lines.push(
      "  fetch(url: string, options?: RequestInit): Promise<Response>;",
    );
    lines.push("}");
    lines.push("");

    lines.push("export interface TakosClientAPI {");
    lines.push("  kv: TakosKVAPI;");
    lines.push("  events: TakosEventsAPI;");
    lines.push("  extensions: TakosExtensionsAPI;");
    lines.push(
      "  fetch(url: string, options?: RequestInit): Promise<Response>;",
    );
    lines.push("}");
    lines.push("");

    lines.push("export interface TakosUIAPI {");
    lines.push("  events: TakosEventsAPI;");
    lines.push("  extensions: TakosExtensionsAPI;");
    lines.push("}");
    lines.push("");

    if (options.context === "server") {
      lines.push("declare global {");
      lines.push("  namespace globalThis {");
      lines.push("    var takos: TakosServerAPI;");
      lines.push("  }");
      lines.push("}");
    } else if (options.context === "client") {
      lines.push("export interface GlobalThisWithClientTakos {");
      lines.push("  takos: TakosClientAPI;");
      lines.push("}");
      lines.push("declare const globalThis: GlobalThisWithClientTakos;");
    } else if (options.context === "ui") {
      lines.push("export interface GlobalThisWithUITakos {");
      lines.push("  takos: TakosUIAPI;");
      lines.push("}");
      lines.push("declare const globalThis: GlobalThisWithUITakos;");
    }

    const content = lines.join("\n");
    const typeCount = (content.match(/(interface|type)\s+\w+/g) || []).length;

    return { filePath: options.outputPath, content, typeCount };
  }

  parseActivityTag(
    value: string,
    targetFunction: string,
  ): ActivityPubConfig | null {
    const match = value.match(/^[\"']([^\"']+)[\"']/);
    if (!match) return null;
    return { object: match[1], hook: targetFunction };
  }

  parseActivityDecorator(
    args: unknown[],
    targetFunction: string,
  ): ActivityPubConfig | null {
    if (args.length === 0) return null;
    const object = args[0] as string;
    return { object, hook: targetFunction };
  }

  private extractEventName(value: string): string | null {
    const m = value.match(/^[\"']([^\"']+)[\"']/);
    return m ? m[1] : null;
  }
}
