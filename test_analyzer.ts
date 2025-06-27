import { ASTAnalyzer } from "./packages/builder/src/analyzer.ts";

// テストファイルを解析
const analyzer = new ASTAnalyzer();
const result = await analyzer.analyze("./test_chain_recognition.ts");

console.log("=== AST Analysis Results ===");
console.log("Method Calls:");
result.methodCalls.forEach(call => {
  console.log(`  ${call.objectName}.${call.methodName}(${call.args.map(arg => JSON.stringify(arg)).join(", ")})`);
  console.log(`    at line ${call.line}, column ${call.column}`);
});

console.log("\nJSDoc Tags:");
result.jsDocTags.forEach(tag => {
  console.log(`  @${tag.tag} ${tag.value} (target: ${tag.targetFunction})`);
});

console.log("\nExports:");
result.exports.forEach(exp => {
  console.log(`  ${exp.name} (${exp.type})`);
});
