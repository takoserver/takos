import { parseArgs } from "jsr:@std/cli@1/parse-args";
import { resolve } from "jsr:@std/path@1";
import { existsSync } from "jsr:@std/fs@1";

import type { CLIInterface, CommandArgs, TakopackConfig } from "./types.ts";
import { build, dev, init, types, watch } from "./commands.ts";

/**
 * CLI Interface
 */
export function createCLI(): CLIInterface {
  return {
    async run(args: string[] = Deno.args): Promise<void> {
      const parsed = parseArgs(args, {
        string: ["config", "out-dir"],
        boolean: ["dev", "verbose", "help", "version"],
        alias: {
          c: "config",
          o: "out-dir",
          d: "dev",
          v: "verbose",
          h: "help",
        },
        default: {
          config: "takopack.config.ts",
          "out-dir": "dist",
          dev: false,
          verbose: false,
        },
      });

      const command = parsed._[0] as string;

      if (parsed.help || command === "help") {
        this.showHelp();
        return;
      }

      if (parsed.version || command === "version") {
        this.showVersion();
        return;
      }

      try {
        await this.executeCommand({
          command: command as CommandArgs["command"],
          config: parsed.config,
          outDir: parsed["out-dir"],
          dev: parsed.dev,
          verbose: parsed.verbose,
        });
      } catch (error) {
        console.error(
          `❌ ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        Deno.exit(1);
      }
    },

    async executeCommand(args: CommandArgs): Promise<void> {
      switch (args.command) {
        case "build":
          await this.handleBuild(args);
          break;
        case "watch":
          await this.handleWatch(args);
          break;
        case "dev":
          await this.handleDev(args);
          break;
        case "init":
          await this.handleInit(args);
          break;
        case "types":
          await this.handleTypes(args);
          break;
        default:
          console.error(`Unknown command: ${args.command}`);
          this.showHelp();
          Deno.exit(1);
      }
    },

    async handleBuild(args: CommandArgs): Promise<void> {
      const config = await this.loadConfig(args.config);
      if (args.outDir) {
        config.build = { ...config.build, outDir: args.outDir };
      }
      if (args.dev) {
        config.build = { ...config.build, dev: true, minify: false };
      }
      const result = await build(config);
      if (!result.success) {
        console.error("❌ Build failed");
        result.errors.forEach((error) => console.error(`  ${error}`));
        Deno.exit(1);
      }
    },

    async handleWatch(args: CommandArgs): Promise<void> {
      const config = await this.loadConfig(args.config);
      if (args.outDir) {
        config.build = { ...config.build, outDir: args.outDir };
      }
      await watch(config);
    },

    async handleDev(args: CommandArgs): Promise<void> {
      const config = await this.loadConfig(args.config);
      if (args.outDir) {
        config.build = { ...config.build, outDir: args.outDir };
      }
      await dev(config);
    },

    async handleInit(_args: CommandArgs): Promise<void> {
      const projectName = Deno.args[1] || "my-extension";
      await init(projectName);
    },

    async handleTypes(args: CommandArgs): Promise<void> {
      const config = await this.loadConfig(args.config);
      const output = args.outDir || "./types";
      await types(config, output);
    },

    async loadConfig(configPath?: string): Promise<TakopackConfig> {
      const configFile = configPath || "takopack.config.ts";
      const resolvedPath = resolve(configFile);
      if (!existsSync(resolvedPath)) {
        throw new Error(`Config file not found: ${resolvedPath}`);
      }
      try {
        const configModule = await import(`file://${resolvedPath}`);
        const config = configModule.default as TakopackConfig;
        if (!config) {
          throw new Error("Config file must export default configuration");
        }
        return config;
      } catch (error) {
        throw new Error(
          `Failed to load config: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    },

    showHelp(): void {
      console.log(`
🐙 Takopack Builder - Extension Build Tool

USAGE:
    takopack <COMMAND> [OPTIONS]

COMMANDS:
    build       Build the extension
    watch       Watch files and rebuild on changes
    dev         Development mode (watch + dev settings)
    init        Initialize a new project
    types       Generate TypeScript definitions
    help        Show this help message
    version     Show version information

OPTIONS:
    -c, --config <FILE>     Configuration file [default: takopack.config.ts]
    -o, --out-dir <DIR>     Output directory [default: dist]
    -d, --dev               Development mode
    -v, --verbose           Verbose output
    -h, --help              Show help

EXAMPLES:
    takopack build
    takopack dev
    takopack init my-extension
    takopack types -o ./types

For more information, visit: https://github.com/takos/takopack
`);
    },

    showVersion(): void {
      console.log("Takopack Builder 4.0.0");
    },
  };
}

/**
 * CLI entry point for standalone execution
 */
export async function main(): Promise<void> {
  const cli = createCLI();
  await cli.run();
}

if (import.meta.main) {
  main();
}
