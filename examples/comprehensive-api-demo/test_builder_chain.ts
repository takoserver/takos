import { TakopackBuilder } from "../../packages/builder/src/builder.ts";

// テスト用のTakopackConfig
const config = {
  manifest: {
    name: "chain-test",
    identifier: "jp.test.chain-test",
    version: "1.0.0",
    description: "Chain method recognition test",
  },
  entries: {
    server: ["./src/server/test_chain.ts"]
  },
  build: {
    outDir: "./test_build_output",
    dev: true,
    analysis: true
  }
};

try {
  console.log("=== Testing Improved Builder ===");
  const builder = new TakopackBuilder(config);
  const result = await builder.build();
  
  console.log("\n=== Build Result ===");
  console.log("Success:", result.success);
  if (result.manifest) {
    console.log("Events found:", Object.keys(result.manifest.eventDefinitions || {}));
    console.log("Event definitions:", result.manifest.eventDefinitions);
  }
  if (result.errors && result.errors.length > 0) {
    console.log("Errors:", result.errors);
  }
} catch (error) {
  console.error("Build failed:", error);
}
