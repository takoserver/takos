import type { BuildResult, TakopackConfig } from "./types.ts";
import { TakopackBuilder } from "./builder.ts";

/**
 * ビルドコマンド
 */
export async function build(config: TakopackConfig): Promise<BuildResult> {
  const builder = new TakopackBuilder(config);
  return await builder.build();
}

/**
 * 監視モード（ファイル変更時に自動ビルド）
 */
export async function watch(config: TakopackConfig): Promise<void> {
  console.log("👀 Watching files for changes...");

  // 最初のビルド
  await build(config);

  // ファイル監視設定
  const watchPaths: string[] = [
    config.entries.server,
    config.entries.client,
    config.entries.ui,
  ].flatMap((p) => p ? Array.isArray(p) ? p : [p] : []);

  if (watchPaths.length === 0) {
    console.warn("⚠️ No files to watch");
    return;
  }

  const watcher = Deno.watchFs(watchPaths);

  let isBuilding = false;
  let pendingRebuild = false;

  for await (const event of watcher) {
    if (
      event.kind === "modify" || event.kind === "create" ||
      event.kind === "remove"
    ) {
      if (isBuilding) {
        pendingRebuild = true;
        continue;
      }

      console.log(`\n🔄 File changed: ${event.paths.join(", ")}`);
      console.log("📦 Rebuilding...");

      isBuilding = true;
      try {
        await build(config);
        console.log("✅ Rebuild completed");
      } catch (error) {
        if (error instanceof Error) {
          console.error("❌ Rebuild failed:", error.message);
        } else {
          console.error("❌ Rebuild failed:", String(error));
        }
      } finally {
        isBuilding = false;

        if (pendingRebuild) {
          pendingRebuild = false;
          // 少し待ってから再ビルド
          setTimeout(async () => {
            if (!isBuilding) {
              console.log("🔄 Pending rebuild...");
              await build(config).catch(console.error);
            }
          }, 500);
        }
      }
    }
  }
}

/**
 * 開発モード（dev設定でビルド + 監視）
 */
export async function dev(config: TakopackConfig): Promise<void> {
  const devConfig: TakopackConfig = {
    ...config,
    build: {
      ...config.build,
      dev: true,
      minify: false,
    },
  };

  console.log("🚧 Development mode");
  await watch(devConfig);
}

/**
 * 新しいプロジェクトの初期化
 */
export async function init(projectName: string): Promise<void> {
  console.log(`🎯 Initializing new Takopack project: ${projectName}`);

  // プロジェクトディレクトリ作成
  if (!await exists(projectName)) {
    await Deno.mkdir(projectName, { recursive: true });
  }

  // サブディレクトリ作成
  const dirs = ["src"];
  for (const dir of dirs) {
    await Deno.mkdir(`${projectName}/${dir}`, { recursive: true });
  }

  // 設定ファイル生成
  const configContent =
    `import { defineConfig } from "@takopack/builder";\n\nexport default defineConfig({\n  manifest: {\n    name: "${projectName}",\n    identifier: "com.example.${projectName.toLowerCase()}",\n    version: "1.0.0",\n    description: "A Takopack extension",\n    permissions: ["kv:read", "kv:write"],\n  },\n\n  entries: {\n    server: "src/server.ts",\n    client: "src/client.ts",\n    ui: "src/index.html",\n  },\n\n  build: {\n    target: "es2022",\n    dev: false,\n  },\n});`;

  await Deno.writeTextFile(`${projectName}/takopack.config.ts`, configContent);

  // サンプルファイル生成
  const serverContent = `// Server-side logic\nconsole.log("Hello from server!");\n`;

  const clientContent =
    `// Client-side background script\nconsole.log("Hello from client background!");\n`;

  const uiContent =
    `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${projectName}</title>\n</head>\n<body>\n    <h1>${projectName}</h1>\n    <p>Welcome to your new Takopack extension!</p>\n</body>\n</html>`;

  await Deno.writeTextFile(`${projectName}/src/server.ts`, serverContent);
  await Deno.writeTextFile(`${projectName}/src/client.ts`, clientContent);
  await Deno.writeTextFile(`${projectName}/src/index.html`, uiContent);

  // README.md生成
  const readmeContent =
    `# ${projectName}\n\nA Takopack extension.\n\n## Development\n\n\`\`\`bash\n# Build the extension\ndeno run -A takopack.ts build\n\n# Development mode\ndeno run -A takopack.ts dev\n\`\`\`\n`;

  await Deno.writeTextFile(`${projectName}/README.md`, readmeContent);

  console.log(`✅ Project initialized successfully!`);
  console.log(`\nNext steps:`);
  console.log(`  cd ${projectName}`);
  console.log(`  deno run -A ../takopack.ts dev`);
}

/**
 * 型定義生成コマンド
 */
export async function types(
  config: TakopackConfig,
  outputDir = "./types",
): Promise<void> {
  const builder = new TakopackBuilder(config);
  await builder.generateAllTypeDefinitions(outputDir);
}

// Utility function
async function exists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}
