import { join, resolve } from "jsr:@std/path@1";
import { existsSync } from "jsr:@std/fs@1";
import { BlobWriter, TextReader, ZipWriter } from "jsr:@zip-js/zip-js@^2.7.62";
import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader@^0.11.1";

import type {
  ActivityPubConfig,
  BuildMetrics,
  BuildResult,
  EventDefinition,
  ExtensionManifest,
  ModuleAnalysis,
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

      // 3. Virtual entrypoint生成
      const virtualEntries = await this.generateVirtualEntries(analyses);

      // 4. esbuildでバンドル
      const bundleResult = await this.bundleWithEsbuild(virtualEntries);

      // 5. マニフェスト生成
      const manifest = this.generateManifest(analyses);

      // 6. UIファイルコピー
      await this.copyUIFiles();

      // 7. .takopackファイル生成
      await this.createTakopackFile();

      // 8. クリーンアップ
      await this.cleanup();

      const buildEndTime = performance.now();

      // 9. 結果レポート
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
      result.server = this.generator.generateServerEntry(analyses.server);

      // ファイルに書き出し
      const serverPath = join(this.tempDir, "_entry_server.ts");
      await Deno.writeTextFile(serverPath, result.server.content);
      console.log(`📝 Generated server virtual entry: ${serverPath}`);
    }

    // クライアントエントリ生成
    if (analyses.client.length > 0) {
      result.client = this.generator.generateClientEntry(analyses.client);

      // ファイルに書き出し
      const clientPath = join(this.tempDir, "_entry_client.ts");
      await Deno.writeTextFile(clientPath, result.client.content);
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
        external: platform === "node" ? [
          // Node.js built-ins
          "node:*",
          "inspector",
          // Large packages that should remain external for server
          "esbuild",
          "typescript",
          "debug",
          "fast-glob",
        ] : [
          // Browser externals - also exclude Node.js things that shouldn't be in browser bundles
          "node:*",
          "inspector",
          "esbuild",
          "typescript",
          "debug",
          "fast-glob",
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
      apiVersion: "2.0",
      permissions: this.config.manifest.permissions || [],
      server: {
        entry: "./server.js",
      },
      client: {
        entryUI: "./index.html",
        entryBackground: "./client.js",
      },
    };

    // イベント定義とActivityPub設定をAST解析結果から抽出
    const eventDefinitions: Record<string, EventDefinition> = {};
    const activityPubConfigs: ActivityPubConfig[] = [];

    const exportedClassSet = new Set<string>();

    [...analyses.server, ...analyses.client].forEach((analysis) => {
      analysis.exports.forEach((exp) => {
        if (exp.type === "class") exportedClassSet.add(exp.name);
      });
    });

    [...analyses.server, ...analyses.client].forEach((analysis) => {
      // JSDocタグから抽出
      analysis.jsDocTags.forEach((tag) => {
        const handlerName = tag.targetClass && exportedClassSet.has(tag.targetClass)
          ? `${tag.targetClass}_${tag.targetFunction}`
          : tag.targetFunction;
        if (tag.tag === "event") {
          const eventName = this.extractEventNameFromTag(tag.value);
          const eventConfig = this.parseEventConfig(
            tag.value,
            handlerName,
          );
          if (eventName && eventConfig) {
            eventDefinitions[eventName] = eventConfig;
          }
        } else if (tag.tag === "activity") {
          const activityConfig = this.parseActivityConfig(
            tag.value,
            handlerName,
          );
          if (activityConfig) {
            activityPubConfigs.push(activityConfig);
          }
        }
      });

      // デコレータから抽出
      analysis.decorators.forEach((decorator) => {
        const handlerName = decorator.targetClass && exportedClassSet.has(decorator.targetClass)
          ? `${decorator.targetClass}_${decorator.targetFunction}`
          : decorator.targetFunction;
        if (decorator.name === "event" && decorator.args.length > 0) {
          const eventName = typeof decorator.args[0] === "string" ? decorator.args[0] : "";
          const options = (typeof decorator.args[1] === "object" &&
              decorator.args[1] !== null)
            ? decorator.args[1] as Record<string, unknown>
            : {};          eventDefinitions[eventName] = {
            source: (options.source as "client" | "server" | "background" | "ui") || "client",
            target: (options.target as "server" | "client" | "client:*" | "ui" | "background") || "server",
            handler: handlerName,
          };
        } else if (decorator.name === "activity" && decorator.args.length > 0) {
          const object = typeof decorator.args[0] === "string" ? decorator.args[0] : "";
          const options = (typeof decorator.args[1] === "object" &&
              decorator.args[1] !== null)
            ? decorator.args[1] as Record<string, unknown>
            : {};          activityPubConfigs.push({
            context: "https://www.w3.org/ns/activitystreams",
            accepts: [object],
            hooks: {
              canAccept: handlerName.startsWith("canAccept") ? handlerName : undefined,
              onReceive: handlerName,
              priority: options.priority as number,
              serial: options.serial as boolean,
            },
          });
        }
      });
    });

    // マニフェストに追加
    if (Object.keys(eventDefinitions).length > 0) {
      manifest.eventDefinitions = eventDefinitions;
    }
    if (activityPubConfigs.length > 0) {
      manifest.activityPub = { objects: activityPubConfigs };
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

    const addFileToZip = async (filePath: string, zipPath: string) => {
      if (existsSync(filePath)) {
        const content = await Deno.readTextFile(filePath);
        await zipWriter.add(zipPath, new TextReader(content));
      }
    };

    // takopack仕様: takos/ ディレクトリ下にファイルを配置
    const requiredFiles = ["manifest.json"];
    const optionalFiles = ["server.js", "client.js", "index.html"];

    // 必須ファイルの追加
    for (const file of requiredFiles) {
      await addFileToZip(join(sauceDir, file), `takos/${file}`);
    }

    // オプションファイルの追加
    for (const file of optionalFiles) {
      const filePath = join(sauceDir, file);
      if (existsSync(filePath)) {
        await addFileToZip(filePath, `takos/${file}`);
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
    return {
      buildStartTime: startTime,
      buildEndTime: endTime,
      totalDuration: endTime - startTime,
      bundlingDuration: 0, // TODO: 個別計測
      validationDuration: 0,
      compressionDuration: 0,
      outputSize: {
        server: bundleResult.server ? this.getFileSize(bundleResult.server) : 0,
        client: bundleResult.client ? this.getFileSize(bundleResult.client) : 0,
        ui: 0, // TODO: UI計測
        total: 0,
      },
      functionCounts: {
        server: 0, // TODO: カウント
        client: 0,
        events: 0,
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
  }

  /**
   * JSDocタグからイベント名を抽出
   */
  private extractEventNameFromTag(value: string): string | null {
    const match = value.match(/^["']([^"']+)["']/);
    return match ? match[1] : null;
  }

  /**
   * イベント設定をパース
   */
  private parseEventConfig(
    value: string,
    targetFunction: string,
  ): EventDefinition | null {
    try {
      const match = value.match(/^["']([^"']+)["'](?:,\s*({.+}))?/);
      if (!match) return null;

      const options = match[2] ? JSON.parse(match[2]) : {};

      return {
        source: options.source || "client",
        target: options.target || "server",
        handler: targetFunction,
      };
    } catch {
      return null;
    }
  }

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
      const options = match[2] ? JSON.parse(match[2]) : {};

      return {
        accepts: [object],
        context: "https://www.w3.org/ns/activitystreams",
        hooks: {
          canAccept: targetFunction.startsWith("canAccept") ? targetFunction : undefined,
          onReceive: targetFunction,
          priority: options.priority,
          serial: options.serial,
        },
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
   */  private async generateUnifiedTypeDefinitions(
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
}
