import type {
  ActivityPubConfig,
  ModuleAnalysis,
  VirtualEntry,
  TypeGenerationOptions,
  TypeGenerationResult,
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
            lines.push(`export const ${name} = (...args: any[]) => ${modVar}.${tag.targetFunction}(...args);`);
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
            lines.push(`export const ${name} = (...args: any[]) => ${modVar}.${tag.targetFunction}(...args);`);
            exports.push(name);
          }
        }
      }
    }
    return { type: "client", exports, imports: [], content: lines.join("\n") };
  }

  generateTypeDefinitions(options: TypeGenerationOptions): TypeGenerationResult {
    return { filePath: options.outputPath, content: "", typeCount: 0 };
  }

  parseActivityTag(value: string, targetFunction: string): ActivityPubConfig | null {
    const match = value.match(/^[\"']([^\"']+)[\"']/);
    if (!match) return null;
    return { object: match[1], hook: targetFunction };
  }

  parseActivityDecorator(args: unknown[], targetFunction: string): ActivityPubConfig | null {
    if (args.length === 0) return null;
    const object = args[0] as string;
    return { object, hook: targetFunction };
  }

  private extractEventName(value: string): string | null {
    const m = value.match(/^[\"']([^\"']+)[\"']/);
    return m ? m[1] : null;
  }
}
