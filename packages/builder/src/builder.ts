import { basename, join, resolve } from "jsr:@std/path@1";
import { existsSync } from "jsr:@std/fs@1";
import { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } from "jsr:@zip-js/zip-js@^2.7.62";
import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.11.1";
// @ts-ignore: Deno module resolution issue with Ajv
import AjvConstructor from "npm:ajv@8.17.1";
// @ts-ignore: Type definitions issue
const Ajv = AjvConstructor.default || AjvConstructor;

// Type definition for Ajv error object
interface ErrorObject {
  instancePath: string;
  message?: string;
}
import manifestSchema from "../../../docs/takopack/manifest.schema.json" with {
  type: "json",
};

import type {
  ActivityPubConfig,
  BuildMetrics,
  BuildResult,
  EventDefinition,
  ExtensionManifest,
  ModuleAnalysis,
  Permission,
  TakopackConfig,
  TypeGenerationOptions,
  TypeGenerationResult,
  VirtualEntry,
} from "./types.ts";
import { ASTAnalyzer } from "./analyzer.ts";
import { VirtualEntryGenerator } from "./generator.ts";
import { defaultConfig } from "./config.ts";

/**
 * Takopack Builder 3.0 メインクラス
 *
 * toString依存をゼロにした新世代ビルドシステム
 * - AST解析による静的分析
 * - Virtual entrypoint生成
 * - esbuildによる最適化
 */
export class TakopackBuilder {
  private config: TakopackConfig;
  private analyzer = new ASTAnalyzer();
  private generator = new VirtualEntryGenerator();
  private tempDir = ".takopack-tmp";
  private ajv = new Ajv({ allowUnionTypes: true });
  private validateManifest = this.ajv.compile(manifestSchema as object);

  constructor(config: TakopackConfig) {
    this.config = { ...defaultConfig, ...config };

    // 設定の検証
    this.validateConfig();
  }

  /**
   * ビルドを実行
   */
  async build(): Promise<BuildResult> {
    const buildStartTime = performance.now();

    console.log(`🚀 Building Takopack 3.0: ${this.config.manifest.name}...`);

    try {
      // 1. テンポラリディレクトリ準備
      await this.prepareTempDir();

      // 2. エントリポイント解析
      const analyses = await this.analyzeEntries();

      if (this.config.build?.strictValidation) {
        await this.validatePermissions();
      }

      // 3. Virtual entrypoint生成
      const virtualEntries = await this.generateVirtualEntries(analyses);

      // 4. esbuildでバンドル
      const bundleResult = await this.bundleWithEsbuild(virtualEntries);

      // 5. マニフェスト生成
      const manifest = this.generateManifest(analyses);
      this.validateManifestSchema(manifest);

      // 6. UIファイルコピー
      await this.copyUIFiles();

      // 7. アイコンファイルコピー
      await this.copyIconFile();

      // 8. .takopackファイル生成
      await this.createTakopackFile();

      // 9. クリーンアップ
      await this.cleanup();

      const buildEndTime = performance.now();

      // 10. 結果レポート
      const metrics = this.buildMetrics(
        buildStartTime,
        buildEndTime,
        bundleResult,
      );
      this.displayBuildReport(metrics);

      return {
        success: true,
        manifest,
        files: bundleResult,
        metrics,
        errors: [],
        warnings: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Build failed:", errorMessage);

      return {
        success: false,
        manifest: {} as ExtensionManifest,
        files: {},
        metrics: {} as BuildMetrics,
        errors: [errorMessage],
        warnings: [],
      };
    }
  }

  /**
   * 設定の検証
   */
  private validateConfig(): void {
    if (!this.config.manifest.name) {
      throw new Error("manifest.name is required");
    }
    if (!this.config.manifest.identifier) {
      throw new Error("manifest.identifier is required");
    }
    if (!this.config.manifest.version) {
      throw new Error("manifest.version is required");
    }
  }

  /**
   * テンポラリディレクトリ準備
   */
  private async prepareTempDir(): Promise<void> {
    if (existsSync(this.tempDir)) {
      await Deno.remove(this.tempDir, { recursive: true });
    }
    await Deno.mkdir(this.tempDir, { recursive: true });
  }

  /**
   * エントリポイントファイルを解析
   */
  private async analyzeEntries(): Promise<{
    server: ModuleAnalysis[];
    client: ModuleAnalysis[];
  }> {
    const serverAnalyses: ModuleAnalysis[] = [];
    const clientAnalyses: ModuleAnalysis[] = [];

    // サーバーエントリポイント解析
    if (this.config.entries.server) {
      for (const entryPath of this.config.entries.server) {
        if (!existsSync(entryPath)) {
          console.warn(`⚠️ Server entry not found: ${entryPath}`);
          continue;
        }

        const analysis = await this.analyzer.analyze(entryPath);
        serverAnalyses.push(analysis);
      }
    }

    // クライアントエントリポイント解析
    if (this.config.entries.client) {
      for (const entryPath of this.config.entries.client) {
        if (!existsSync(entryPath)) {
          console.warn(`⚠️ Client entry not found: ${entryPath}`);
          continue;
        }

        const analysis = await this.analyzer.analyze(entryPath);
        clientAnalyses.push(analysis);
      }
    }

    console.log(
      `📊 Analyzed ${serverAnalyses.length} server entries, ${clientAnalyses.length} client entries`,
    );

    return { server: serverAnalyses, client: clientAnalyses };
  }

  /**
   * Virtual entrypoint生成
   */
  private async generateVirtualEntries(analyses: {
    server: ModuleAnalysis[];
    client: ModuleAnalysis[];
  }): Promise<{
    server?: VirtualEntry;
    client?: VirtualEntry;
  }> {
    const result: { server?: VirtualEntry; client?: VirtualEntry } = {};

    // サーバーエントリ生成
    if (analyses.server.length > 0) {
      const serverEntry = this.generator.generateServerEntry(analyses.server);
      result.server = serverEntry;

      // ファイルに書き出し
      const serverPath = join(this.tempDir, "_entry_server.ts");
      await Deno.writeTextFile(serverPath, serverEntry.content);
      console.log(`📝 Generated server virtual entry: ${serverPath}`);
    }

    // クライアントエントリ生成
    if (analyses.client.length > 0) {
      const clientEntry = this.generator.generateClientEntry(analyses.client);
      result.client = clientEntry;

      // ファイルに書き出し
      const clientPath = join(this.tempDir, "_entry_client.ts");
      await Deno.writeTextFile(clientPath, clientEntry.content);
      console.log(`📝 Generated client virtual entry: ${clientPath}`);
    }

    return result;
  }

  /**
   * esbuildでバンドル
   */
  private async bundleWithEsbuild(virtualEntries: {
    server?: VirtualEntry;
    client?: VirtualEntry;
  }): Promise<{
    server?: string;
    client?: string;
  }> {
    const result: { server?: string; client?: string } = {};
    const outDir = this.config.build?.outDir || "dist";
    const sauceDir = join(outDir, "sauce");

    // sauceディレクトリ作成
    if (!existsSync(sauceDir)) {
      await Deno.mkdir(sauceDir, { recursive: true });
    }

    // サーバーバンドル
    if (virtualEntries.server) {
      console.log("🔧 Bundling server...");
      await this.bundleFile(
        join(this.tempDir, "_entry_server.ts"),
        join(sauceDir, "server.js"),
        "node",
      );
      result.server = join(sauceDir, "server.js");
    }

    // クライアントバンドル
    if (virtualEntries.client) {
      console.log("🔧 Bundling client...");
      await this.bundleFile(
        join(this.tempDir, "_entry_client.ts"),
        join(sauceDir, "client.js"),
        "browser",
      );
      result.client = join(sauceDir, "client.js");
    }

    return result;
  }
  /**
   * 単一ファイルをesbuildでバンドル
   */
  private async bundleFile(
    entryPoint: string,
    outputPath: string,
    platform: "node" | "browser",
  ): Promise<void> {
    try {
      const buildOptions: esbuild.BuildOptions = {
        entryPoints: [entryPoint],
        outfile: outputPath,
        bundle: true,
        format: "esm",
        platform: platform === "node" ? "node" : "browser",
        target: this.config.build?.target || "es2022",
        minify: !this.config.build?.dev && (this.config.build?.minify ?? true),
        sourcemap: this.config.build?.dev,
        treeShaking: true,
        mainFields: ["module", "main"],
        external: [
          // Keep only Node built-ins external so Deno can resolve bundled deps
          "node:*",
          "inspector",
        ],
        plugins: [
          ...denoPlugins({
            configPath: resolve("deno.json"),
          }),
        ],
      };

      const result = await esbuild.build(buildOptions);

      if (result.errors.length > 0) {
        throw new Error(
          `Build errors: ${result.errors.map((e) => e.text).join(", ")}`,
        );
      }

      console.log(`✅ Bundled: ${entryPoint} → ${outputPath}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to bundle ${entryPoint}: ${errorMessage}`);
    }
  }

  /**
   * マニフェスト生成
   */
  private generateManifest(analyses: {
    server: ModuleAnalysis[];
    client: ModuleAnalysis[];
  }): ExtensionManifest {
    const manifest: ExtensionManifest = {
      name: this.config.manifest.name,
      description: this.config.manifest.description || "",
      version: this.config.manifest.version,
      identifier: this.config.manifest.identifier,
      icon: this.config.manifest.icon ? `./${basename(this.config.manifest.icon)}` : undefined,
      apiVersion: "3.0",
      permissions: this.config.manifest.permissions || [],
      extensionDependencies: this.config.manifest.extensionDependencies,
      server: {
        entry: "./server.js",
      },
      client: {
        entryUI: "./index.html",
        entryBackground: "./client.js",
      },
    };

    // ActivityPub設定をAST解析結果から抽出
    const activityPubConfigs: ActivityPubConfig[] = [];

    const exportedClassSet = new Set<string>();

    [...analyses.server, ...analyses.client].forEach((analysis) => {
      analysis.exports.forEach((exp) => {
        if (exp.type === "class") exportedClassSet.add(exp.name);
      });
      // JSDoc based activity hooks
      for (const tag of analysis.jsDocTags) {
        if (tag.tag === "activity") {
          const cfg = this.generator.parseActivityTag(tag.value, tag.targetFunction);
          if (cfg) activityPubConfigs.push(cfg);
        }
      }
      // Decorator based activity hooks
      for (const dec of analysis.decorators) {
        if (dec.name === "activity") {
          const cfg = this.generator.parseActivityDecorator(dec.args, dec.targetFunction);
          if (cfg) activityPubConfigs.push(cfg);
        }
      }
    });
    // デバッグ用: AST解析結果を出力
    console.log("🔍 AST Analysis Debug:");
    [...analyses.server, ...analyses.client].forEach((analysis) => {
      console.log(`  File: ${analysis.filePath}`);
      console.log(`    JSDoc tags: ${analysis.jsDocTags.length}`);
      analysis.jsDocTags.forEach((tag) => {
        console.log(
          `      @${tag.tag}: ${tag.value} (target: ${tag.targetFunction})`,
        );
      });
      console.log(`    Decorators: ${analysis.decorators.length}`);
      analysis.decorators.forEach((decorator) => {
        console.log(
          `      @${decorator.name}(${
            JSON.stringify(decorator.args)
          }) (target: ${decorator.targetFunction})`,
        );
      });
      console.log(`    Exports: ${analysis.exports.length}`);
      analysis.exports.forEach((exp) => {
        console.log(
          `      export ${exp.type} ${exp.name} ${
            exp.instanceOf ? `(instanceOf: ${exp.instanceOf})` : ""
          }`,
        );
      });
      console.log(`    Method calls: ${analysis.methodCalls.length}`);
      analysis.methodCalls.forEach((call) => {
        console.log(
          `      ${call.objectName}.${call.methodName}(${call.args.join(", ")})`,
        );
      });
    });

    // マニフェストに追加
    // v3 では manifest.eventDefinitions を生成しない
    if (activityPubConfigs.length > 0) {
      manifest.activityPub = {
        objects: activityPubConfigs.map((c) => c.object),
        hook: activityPubConfigs[0].hook,
      };
    }

    return manifest;
  }

  /**
   * UIファイルをコピー
   */
  private async copyUIFiles(): Promise<void> {
    const outDir = this.config.build?.outDir || "dist";
    const sauceDir = join(outDir, "sauce");

    if (this.config.entries.ui) {
      for (const uiPath of this.config.entries.ui) {
        if (existsSync(uiPath)) {
          const filename = uiPath.split("/").pop() || "index.html";
          const destPath = join(sauceDir, filename);
          await Deno.copyFile(uiPath, destPath);
          console.log(`📋 Copied UI: ${uiPath} → ${destPath}`);
        }
      }
    }
  }

  /**
   * アイコンファイルをコピー
   */
  private async copyIconFile(): Promise<void> {
    if (!this.config.manifest.icon) return;
    const outDir = this.config.build?.outDir || "dist";
    const sauceDir = join(outDir, "sauce");
    const iconPath = this.config.manifest.icon;
    if (existsSync(iconPath)) {
      const destPath = join(sauceDir, basename(iconPath));
      await Deno.copyFile(iconPath, destPath);
      console.log(`📋 Copied icon: ${iconPath} → ${destPath}`);
    }
  }

  /**
   * .takopackファイル生成
   */
  private async createTakopackFile(): Promise<void> {
    const outDir = this.config.build?.outDir || "dist";
    const sauceDir = join(outDir, "sauce");

    // マニフェスト保存
    const manifest = this.generateManifest(await this.analyzeEntries());
    await Deno.writeTextFile(
      join(sauceDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );

    // ZIP作成
    const zipFile = new BlobWriter("application/zip");
    const zipWriter = new ZipWriter(zipFile);

    const addFileToZip = async (
      filePath: string,
      zipPath: string,
      binary = false,
    ) => {
      if (existsSync(filePath)) {
        if (binary) {
          const buf = await Deno.readFile(filePath);
          await zipWriter.add(zipPath, new Uint8ArrayReader(buf));
        } else {
          const content = await Deno.readTextFile(filePath);
          await zipWriter.add(zipPath, new TextReader(content));
        }
      }
    };

    // takopack仕様: takos/ ディレクトリ下にファイルを配置
    const requiredFiles = ["manifest.json"];
    const optionalFiles = ["server.js", "client.js", "index.html"];
    let iconFile: string | undefined;
    if (this.config.manifest.icon) {
      iconFile = basename(this.config.manifest.icon);
      optionalFiles.push(iconFile);
    }

    // 必須ファイルの追加
    for (const file of requiredFiles) {
      await addFileToZip(join(sauceDir, file), `takos/${file}`);
    }

    // オプションファイルの追加
    for (const file of optionalFiles) {
      const filePath = join(sauceDir, file);
      if (existsSync(filePath)) {
        const isIcon = iconFile && file === iconFile;
        await addFileToZip(filePath, `takos/${file}`, Boolean(isIcon));
      }
    }

    await zipWriter.close();

    // ZIP ファイルの書き込み
    const zipBlob = await zipFile.getData();
    const arrayBuffer = await zipBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const packageName = this.config.manifest.identifier.split(".").pop() ||
      "extension";
    const outputPath = join(outDir, `${packageName}.takopack`);
    await Deno.writeFile(outputPath, uint8Array);

    console.log(`📦 Created ${outputPath}`);
  }

  /**
   * クリーンアップ
   */
  private async cleanup(): Promise<void> {
    if (existsSync(this.tempDir)) {
      await Deno.remove(this.tempDir, { recursive: true });
    }
  }

  /**
   * ビルドメトリクス生成
   */
  private buildMetrics(
    startTime: number,
    endTime: number,
    bundleResult: { server?: string; client?: string },
  ): BuildMetrics {
    const serverSize = bundleResult.server ? this.getFileSize(bundleResult.server) : 0;
    const clientSize = bundleResult.client ? this.getFileSize(bundleResult.client) : 0;
    return {
      buildStartTime: startTime,
      buildEndTime: endTime,
      totalDuration: endTime - startTime,
      outputSize: {
        server: serverSize,
        client: clientSize,
        ui: 0, // TODO: UI計測
        total: serverSize + clientSize,
      },
      warnings: [],
      errors: [],
    };
  }

  /**
   * ビルドレポート表示
   */
  private displayBuildReport(metrics: BuildMetrics): void {
    console.log("\n📊 Build Report:");
    console.log(
      `  ⏱️  Total build time: ${metrics.totalDuration.toFixed(2)}ms`,
    );
    console.log(
      `  📦 Package: ${this.config.manifest.name} v${this.config.manifest.version}`,
    );
    console.log(
      `  🔐 Permissions: ${this.config.manifest.permissions?.length || 0}`,
    );

    if (this.config.build?.dev) {
      console.log("  🚧 Development mode enabled");
    } else {
      console.log("  🚀 Production build completed");
    }

    if (this.config.build?.analytics) {
      const format = (s: number) => `${(s / 1024).toFixed(1)}KB`;
      console.log(
        `  📦 Bundle sizes: server ${format(metrics.outputSize.server)}, ` +
          `client ${format(metrics.outputSize.client)}`,
      );
    }
  }

  /**
   * ファイルサイズ取得
   */
  private getFileSize(filePath: string): number {
    try {
      const stat = Deno.statSync(filePath);
      return stat.size;
    } catch {
      return 0;
    }
  } /**
   * JSDocタグからイベント名を抽出
   */

  private extractEventNameFromTag(value: string): string | null {
    console.log(`[DEBUG] extractEventNameFromTag - value: "${value}"`);

    // まず複雑な形式 "("eventName", { ... })" を試す
    const match = value.match(/^\("([^"']+)"/);
    console.log(`[DEBUG] extractEventNameFromTag - complex match: ${match}`);

    if (match) {
      const result = match[1];
      console.log(
        `[DEBUG] extractEventNameFromTag - complex result: ${result}`,
      );
      return result;
    }

    // シンプルな形式 " eventName" を試す
    const simpleMatch = value.trim();
    console.log(
      `[DEBUG] extractEventNameFromTag - simple match: "${simpleMatch}"`,
    );

    if (
      simpleMatch && !simpleMatch.includes("(") && !simpleMatch.includes("{")
    ) {
      console.log(
        `[DEBUG] extractEventNameFromTag - simple result: ${simpleMatch}`,
      );
      return simpleMatch;
    }

    console.log(`[DEBUG] extractEventNameFromTag - no match found`);
    return null;
  } /**
   * イベント設定をパース
   */

  private parseEventConfig(
    value: string,
    targetFunction: string,
  ): EventDefinition | null {
    try {
      console.log(
        `[DEBUG] parseEventConfig - value: "${value}", targetFunction: "${targetFunction}"`,
      );

      // まず複雑な形式 "("eventName", { ... })" を試す
      const complexMatch = value.match(/^\("([^"']+)"(?:,\s*({.+}))?/);
      console.log(`[DEBUG] parseEventConfig - complex match: ${complexMatch}`);

      if (complexMatch) {
        let options: Record<string, unknown> = {};
        if (complexMatch[2]) {
          try {
            // JavaScriptオブジェクトリテラルをJSONに変換
            const jsObjectString = complexMatch[2];
            const jsonString = jsObjectString.replace(/(\w+):/g, '"$1":');
            console.log(`[DEBUG] parseEventConfig - jsonString: ${jsonString}`);
            options = JSON.parse(jsonString);
          } catch (jsonError) {
            console.log(
              `[DEBUG] parseEventConfig - JSON parse error: ${jsonError}`,
            );
            // eval を使って JavaScript オブジェクトリテラルを評価
            options = eval("(" + complexMatch[2] + ")");
          }
        }
        console.log(
          `[DEBUG] parseEventConfig - options: ${JSON.stringify(options)}`,
        );

        const result = {
          source: (options.source as "client" | "server" | "background" | "ui") ||
            "client",
          handler: targetFunction,
        };
        console.log(
          `[DEBUG] parseEventConfig - complex result: ${JSON.stringify(result)}`,
        );
        return result;
      }

      // シンプルな形式 " eventName" の場合はデフォルト設定を使用
      const simpleValue = value.trim();
      if (
        simpleValue && !simpleValue.includes("(") && !simpleValue.includes("{")
      ) {
        const result = {
          source: "client" as const,
          handler: targetFunction,
        };
        console.log(
          `[DEBUG] parseEventConfig - simple result: ${JSON.stringify(result)}`,
        );
        return result;
      }
      console.log(`[DEBUG] parseEventConfig - no match found`);
      return null;
    } catch (error) {
      console.log(`[DEBUG] parseEventConfig - error: ${error}`);
      return null;
    }
  }

  /**
  /**
   * ActivityPub設定をパース
   */
  private parseActivityConfig(
    value: string,
    targetFunction: string,
  ): ActivityPubConfig | null {
    try {
      const match = value.match(/^["']([^"']+)["'](?:,\s*({.+}))?/);
      if (!match) return null;

      const object = match[1];
      return {
        object,
        hook: targetFunction,
      };
    } catch {
      return null;
    }
  }
  /**
   * TypeScript型定義ファイルを生成
   */
  async generateTypeDefinitions(
    options: TypeGenerationOptions,
  ): Promise<TypeGenerationResult> {
    console.log(
      `🔧 Generating TypeScript definitions for ${options.context} context...`,
    );

    try {
      // 型定義を生成
      const result = this.generator.generateTypeDefinitions(options);

      // ファイルに書き出し
      const encoder = new TextEncoder();
      const data = encoder.encode(result.content);
      await Deno.writeFile(result.filePath, data);

      console.log(
        `✅ Generated ${result.typeCount} types to ${result.filePath}`,
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Type definition generation failed:", errorMessage);
      throw error;
    }
  }

  /**
   * 全コンテキストの型定義を生成
   */
  async generateAllTypeDefinitions(
    outputDir = "./types",
  ): Promise<TypeGenerationResult[]> {
    console.log("🔧 Generating TypeScript definitions for all contexts...");

    // 出力ディレクトリを作成
    try {
      await Deno.mkdir(outputDir, { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) {
        throw error;
      }
    }

    const contexts: Array<"server" | "client" | "ui"> = [
      "server",
      "client",
      "ui",
    ];
    const results: TypeGenerationResult[] = [];

    for (const context of contexts) {
      const options: TypeGenerationOptions = {
        context,
        outputPath: `${outputDir}/takos-${context}.d.ts`,
        includeCustomTypes: true,
      };

      const result = await this.generateTypeDefinitions(options);
      results.push(result);
    }

    // 統合型定義ファイルも生成
    await this.generateUnifiedTypeDefinitions(outputDir, results);

    console.log(
      `✅ Generated type definitions for all contexts in ${outputDir}/`,
    );
    return results;
  }

  /**
   * 統合型定義ファイルを生成
   */ private async generateUnifiedTypeDefinitions(
    outputDir: string,
    _results: TypeGenerationResult[],
  ): Promise<void> {
    const lines: string[] = [];

    lines.push("// Unified TypeScript definitions for Takos Extension");
    lines.push("// This file exports all context-specific types");
    lines.push("// Generated at: " + new Date().toISOString());
    lines.push("");

    // 各コンテキストの型定義をエクスポート
    lines.push("// Export context-specific types");
    lines.push("export * from './takos-server.d.ts';");
    lines.push("export * from './takos-client.d.ts';");
    lines.push("export * from './takos-ui.d.ts';");
    lines.push("");

    // 型選択ヘルパー
    lines.push("// Type selection helpers");
    lines.push(
      "export type TakosContextAPI<T extends 'server' | 'client' | 'ui'> = ",
    );
    lines.push("  T extends 'server' ? typeof globalThis.takos :");
    lines.push("  T extends 'client' ? GlobalThisWithClientTakos['takos'] :");
    lines.push("  T extends 'ui' ? GlobalThisWithUITakos['takos'] :");
    lines.push("  never;");
    lines.push("");

    const content = lines.join("\n");
    const filePath = `${outputDir}/index.d.ts`;

    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    await Deno.writeFile(filePath, data);

    console.log(`📋 Generated unified type definitions: ${filePath}`);
  }

  /**
   * Takopack拡張クラスかどうかを判定
   */
  private isTakopackExtensionClass(className: string): boolean {
    // チェーン形式のTakosクラスのみをサポート
    return className === "Takos";
  }

  /**
   * クラスインスタンスからイベント定義を抽出
   */
  private extractEventDefinitionsFromClasses(
    analyses: { server: ModuleAnalysis[]; client: ModuleAnalysis[] },
    eventDefinitions: Record<string, EventDefinition>,
  ): boolean {
    let hasDefinitions = false;

    [...analyses.server, ...analyses.client].forEach((analysis) => {
      // チェーン形式メソッド呼び出しからイベント定義を抽出
      analysis.methodCalls.forEach((call) => {
        // Takopackのクラス名から直接呼び出されているメソッドを検出
        if (this.isTakopackExtensionClass(call.objectName)) {
          console.log(
            `🔗 Processing chained method call: ${call.objectName}.${call.methodName}(${
              call.args.join(", ")
            })`,
          );

          // server, client, ui, background メソッドかどうかチェック
          if (
            ["server", "client", "ui", "background"].includes(call.methodName)
          ) {
            const eventName = call.args[0] as string;
            const handlerArg = call.args[1];
            let handlerName = "";

            if (typeof handlerArg === "string") {
              // 関数名が文字列で渡された場合
              handlerName = handlerArg;
            } else {
              // 関数オブジェクトが渡された場合、その関数名を推測
              handlerName = "anonymous";
            }

            if (eventName) {
              eventDefinitions[eventName] = {
                source: call.methodName as
                  | "client"
                  | "server"
                  | "background"
                  | "ui",
                handler: handlerName,
              };
              console.log(
                `✅ Registered chained event: ${eventName} -> ${handlerName} (${call.methodName})`,
              );
              hasDefinitions = true;
            }
          }
        }
      });
    });

    return hasDefinitions;
  }

  private async validatePermissions(): Promise<void> {
    const files: string[] = [
      ...(this.config.entries.server ?? []),
      ...(this.config.entries.client ?? []),
    ];

    const required = new Set<Permission>();

    for (const file of files) {
      if (!existsSync(file)) continue;
      const code = await Deno.readTextFile(file);
      if (/takos\.kv\./.test(code)) {
        required.add("kv:read");
        required.add("kv:write");
      }
      if (/takos\.cdn\./.test(code)) {
        required.add("cdn:read");
        required.add("cdn:write");
      }
      if (/takos\.ap\./.test(code)) {
        required.add("activitypub:send");
        required.add("activitypub:read");
      }
      if (/fetchFromTakos|takos\.fetch/.test(code)) {
        required.add("fetch:net");
      }
      if (/takos\.extensions\./.test(code)) {
        required.add("extensions:invoke");
      }
    }

    const manifestPerms = this.config.manifest.permissions ?? [];
    const missing = [...required].filter((p) => !manifestPerms.includes(p));
    if (missing.length > 0) {
      throw new Error(
        `Missing required permissions in manifest: ${missing.join(", ")}`,
      );
    }
  }

  private validateManifestSchema(manifest: ExtensionManifest): void {
    const valid = this.validateManifest(manifest);
    if (!valid) {
      const errors = this.validateManifest.errors?.map((e) => `${e.instancePath} ${e.message || 'unknown error'}`)
        .join(", ");
      throw new Error(`Manifest schema validation failed: ${errors}`);
    }
  }
}
