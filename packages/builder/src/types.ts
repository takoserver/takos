// Permission types based on the specification
export type Permission =
  | "fetch:net"
  | "activitypub:send"
  | "activitypub:read"
  | "activitypub:receive:hook"
  | "activitypub:actor:read"
  | "activitypub:actor:write"
  | "plugin-actor:create"
  | "plugin-actor:read"
  | "plugin-actor:write"
  | "plugin-actor:delete"
  | "kv:read"
  | "kv:write"
  | "cdn:read"
  | "cdn:write"
  | "events:publish"
  | "deno:read"
  | "deno:write"
  | "deno:net"
  | "deno:env"
  | "deno:run"
  | "deno:sys"
  | "deno:ffi"
  | "extensions:invoke"
  | "extensions:export";

/**
 * Build Result
 */
export interface BuildResult {
  success: boolean;
  manifest: ExtensionManifest;
  files: {
    server?: string;
    client?: string;
    ui?: string;
  };
  metrics: BuildMetrics;
  errors: string[];
  warnings: string[];
}

export interface BuildMetrics {
  buildStartTime: number;
  buildEndTime: number;
  totalDuration: number;
  outputSize: {
    server: number;
    client: number;
    ui: number;
    total: number;
  };
  warnings: string[];
  errors: string[];
}

/**
 * Takopack manifest
 */
export interface ExtensionManifest {
  name: string;
  description?: string;
  version: string;
  identifier: string;
  /** Path to the icon file */
  icon?: string;
  apiVersion?: string;
  permissions?: Permission[];
  /** Declaration of dependent extensions */
  extensionDependencies?: Array<{
    identifier: string;
    version: string;
  }>;
  /**
   * APIs exported for other extensions.
   */
  exports?: string[];
  server?: {
    entry: string;
  };
  client?: {
    entryUI?: string;
    entryBackground?: string;
  };
  activityPub?: {
    objects: string[];
    hook: string;
  };
}

/**
 * CLI Command Arguments
 */
export interface CommandArgs {
  command: "build" | "watch" | "dev" | "init" | "types";
  config?: string;
  outDir?: string;
  dev?: boolean;
  verbose?: boolean;
}

/**
 * CLI Interface
 */
export interface CLIInterface {
  run(args?: string[]): Promise<void>;
  executeCommand(args: CommandArgs): Promise<void>;
  handleBuild(args: CommandArgs): Promise<void>;
  handleWatch(args: CommandArgs): Promise<void>;
  handleDev(args: CommandArgs): Promise<void>;
  handleInit(args: CommandArgs): Promise<void>;
  handleTypes(args: CommandArgs): Promise<void>;
  loadConfig(configPath?: string): Promise<TakopackConfig>;
  showHelp(): void;
  showVersion(): void;
}

/**
 * Takopack Configuration
 */
export interface TakopackConfig {
  /** Manifest settings */
  manifest: {
    name: string;
    identifier: string;
    version: string;
    description?: string;
    icon?: string;
    permissions?: Permission[];
    extensionDependencies?: Array<{ identifier: string; version: string }>;
    /** APIs exported for other extensions. */
    exports?: string[];
  };

  /** Entry points */
  entries: {
    server?: string;
    client?: string;
    ui?: string;
  };

  /** Build settings */
  build?: {
    target?: string;
    dev?: boolean;
    outDir?: string;
    minify?: boolean;
  };

  /** Plugin settings */
  plugins?: TakopackPlugin[];
}

/**
 * Plugin Interface
 */
export interface TakopackPlugin {
  name: string;
  setup(build: PluginContext): void | Promise<void>;
}

export interface PluginContext {
  onTransform?: (
    callback: (
      args: TransformArgs,
    ) => TransformResult | Promise<TransformResult>,
  ) => void;
  onGenerate?: (callback: (args: GenerateArgs) => void | Promise<void>) => void;
}

export interface TransformArgs {
  filePath: string;
  code: string;
  isEntry: boolean;
}

export interface TransformResult {
  code?: string;
  map?: string;
}

export interface GenerateArgs {
  manifest: ExtensionManifest;
  files: Map<string, string>;
}
