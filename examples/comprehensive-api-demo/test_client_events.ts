import { ASTAnalyzer } from "../../packages/builder/src/analyzer.ts";

// 改良されたクライアントファイルを解析
const analyzer = new ASTAnalyzer();
const result = await analyzer.analyze("./src/client/index.ts");

console.log("=== Client Method Calls Found ===");
const clientMethodCalls = result.methodCalls.filter(call => 
  call.objectName === "Takos" && 
  ['server', 'client', 'ui', 'background'].includes(call.methodName)
);

clientMethodCalls.forEach(call => {
  console.log(`${call.objectName}.${call.methodName}("${call.args[0]}", "${call.args[1]}")`);
});

// イベント抽出のシミュレーション
console.log("\n=== Client Event Extraction ===");
const eventDefinitions: Record<string, { source: string; handler: string }> = {};

clientMethodCalls.forEach((call) => {
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
