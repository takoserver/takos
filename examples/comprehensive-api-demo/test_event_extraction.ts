import { ASTAnalyzer } from "../../packages/builder/src/analyzer.ts";

// テストファイルを解析してイベント抽出をテスト
const analyzer = new ASTAnalyzer();
const result = await analyzer.analyze("./src/server/test_chain.ts");

console.log("=== Method Calls Found ===");
result.methodCalls.forEach(call => {
  console.log(`${call.objectName}.${call.methodName}(${call.args.map(arg => JSON.stringify(arg)).join(", ")})`);
});

// イベント抽出のシミュレーション
console.log("\n=== Event Extraction Simulation ===");
const eventDefinitions: Record<string, { source: string; handler: string }> = {};

result.methodCalls.forEach((call) => {
  // Takopackのクラス名から直接呼び出されているメソッドを検出
  if (call.objectName === "Takos") {
    console.log(`🔗 Processing chained method call: ${call.objectName}.${call.methodName}(${call.args.join(', ')})`);
    
    // server, client, ui, background メソッドかどうかチェック
    if (['server', 'client', 'ui', 'background'].includes(call.methodName)) {
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
        console.log(`✅ Registered chained event: ${eventName} -> ${handlerName} (${call.methodName})`);
      }
    }
  }
});

console.log("\n=== Final Event Definitions ===");
console.log(eventDefinitions);
