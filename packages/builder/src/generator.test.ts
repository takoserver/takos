import { VirtualEntryGenerator } from "./generator.ts";
import type { ModuleAnalysis } from "./types.ts";

Deno.test("export wrappers use method name", () => {
  const analysis: ModuleAnalysis = {
    filePath: "mod.ts",
    exports: [
      {
        name: "ApiServer",
        type: "const",
        isDefault: false,
        line: 1,
        column: 0,
        instanceOf: "ServerExtension",
      },
    ],
    imports: [],
    decorators: [],
    jsDocTags: [
      {
        tag: "event",
        value: '"runServerTests", {"source": "ui"}',
        targetFunction: "onRunServerTests",
        targetClass: "ApiServer",
        line: 2,
      },
    ],
    methodCalls: [],
  };

  const gen = new VirtualEntryGenerator();
  const entry = gen.generateServerEntry([analysis]);
  if (!entry.content.includes("export const runServerTests")) {
    throw new Error("wrapper name mismatch");
  }
});

Deno.test("parseActivityTag generates config", () => {
  const gen = new VirtualEntryGenerator();
  const cfg = gen.parseActivityTag(
    '"Note"',
    "onReceiveNote",
  );
  if (!cfg || cfg.object !== "Note" || cfg.hook !== "onReceiveNote") {
    throw new Error("ActivityPub config not parsed correctly");
  }
});

Deno.test("parseActivityDecorator generates config", () => {
  const gen = new VirtualEntryGenerator();
  const cfg = gen.parseActivityDecorator(["Note"], "onNote");
  if (!cfg || cfg.object !== "Note" || cfg.hook !== "onNote") {
    throw new Error("ActivityPub decorator not parsed correctly");
  }
});
