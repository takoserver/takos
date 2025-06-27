import { ASTAnalyzer } from "../../packages/builder/src/analyzer.ts";

// 改良されたサーバーファイルを解析
const analyzer = new ASTAnalyzer();
const result = await analyzer.analyze("./src/server/index.ts");

console.log("=== Server Method Calls Found ===");
const serverMethodCalls = result.methodCalls.filter(call => 
  call.objectName === "Takos" && 
  ['server', 'client', 'ui', 'background'].includes(call.methodName)
);

serverMethodCalls.forEach(call => {
  console.log(`${call.objectName}.${call.methodName}("${call.args[0]}", "${call.args[1]}")`);
});

// イベント抽出のシミュレーション
console.log("\n=== Server Event Extraction ===");
const eventDefinitions: Record<string, { source: string; handler: string }> = {};

serverMethodCalls.forEach((call) => {
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

console.log(`\n=== Total Events Found: ${Object.keys(eventDefinitions).length} ===`);
