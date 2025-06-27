import { ASTAnalyzer } from "../../packages/builder/src/analyzer.ts";

// 改良されたサーバーファイルを解析（従来方式廃止後）
const analyzer = new ASTAnalyzer();
const result = await analyzer.analyze("./src/server/index.ts");

console.log("=== Method Calls (Takos only) ===");
const takosMethodCalls = result.methodCalls.filter(call => 
  call.objectName === "Takos" && 
  ['server', 'client', 'ui', 'background'].includes(call.methodName)
);

takosMethodCalls.forEach(call => {
  console.log(`${call.objectName}.${call.methodName}("${call.args[0]}", "${call.args[1]}")`);
});

// イベント抽出のシミュレーション（チェーン形式のみ）
console.log("\n=== Unified Event Extraction (Chain-only) ===");
const eventDefinitions: Record<string, { source: string; handler: string }> = {};

takosMethodCalls.forEach((call) => {
  const eventName = call.args[0] as string;
  const handlerArg = call.args[1];
  let handlerName = '';
  
  if (typeof handlerArg === 'string') {
    handlerName = handlerArg;
  } else {
    handlerName = 'anonymous';
  }
  
  if (eventName) {
    eventDefinitions[eventName] = {
      source: call.methodName,
      handler: handlerName,
    };
    console.log(`✅ ${eventName} -> ${handlerName} (${call.methodName})`);
  }
});

console.log(`\n=== Total Events (Chain-only): ${Object.keys(eventDefinitions).length} ===`);
