import type { ModuleAnalysis } from "./types.ts";

export class ASTAnalyzer {
  async analyze(filePath: string): Promise<ModuleAnalysis> {
    const code = await Deno.readTextFile(filePath);
    return this.analyzeCode(filePath, code);
  }

  analyzeCode(filePath: string, _code: string): ModuleAnalysis {
    return {
      filePath,
      exports: [],
      imports: [],
      decorators: [],
      jsDocTags: [],
      methodCalls: [],
    };
  }
}
