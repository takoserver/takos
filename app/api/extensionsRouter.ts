import { Hono } from "hono";
import { Extension } from "./models/extension.ts";
import type { Env } from "./index.ts";
import { join, dirname, fromFileUrl } from "@std/path";
import { loadExtension, unloadExtension } from "./utils/extensionsRuntime.ts";

const initScript = await Deno.readTextFile(new URL("./initExtension.js", import.meta.url));

// ローカル拡張機能ディレクトリのパス
const EXTENSIONS_DIR = join(dirname(dirname(fromFileUrl(import.meta.url))), "..", "examples");

/**
 * ローカルファイルシステムから拡張機能のファイルを読み込む
 */
async function loadExtensionFromLocal(identifier: string, fileName: string): Promise<string | null> {
  try {
    // 拡張機能のディレクトリを推測
    const extName = identifier.split('.').pop(); // jp.takos.api-test -> api-test
    const distPath = join(EXTENSIONS_DIR, extName || identifier, "dist", "sauce", fileName);
    
    const content = await Deno.readTextFile(distPath);
    return content;
  } catch (error) {
    const err = error as Error;
    console.warn(`Failed to load ${fileName} for ${identifier} from local:`, err.message);
    return null;
  }
}

/**
 * ローカルファイルシステムからバイナリファイルを読み込む
 */
async function loadExtensionBinaryFromLocal(identifier: string, fileName: string): Promise<Uint8Array | null> {
  try {
    const extName = identifier.split('.').pop();
    const distPath = join(EXTENSIONS_DIR, extName || identifier, "dist", "sauce", fileName);
    
    const content = await Deno.readFile(distPath);
    return content;
  } catch (error) {
    const err = error as Error;
    console.warn(`Failed to load binary ${fileName} for ${identifier} from local:`, err.message);
    return null;
  }
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/extensions", async (c) => {
  const extensions = await Extension.find().select("identifier client");
  return c.json(
    extensions.map((e) => ({ identifier: e.identifier, client: e.client })),
  );
});

// 拡張機能をインストール/登録するエンドポイント
app.post("/api/extensions/:id/install", async (c) => {
  const id = c.req.param("id");
  
  try {
    // 既存の拡張機能をチェック
    let existing = await Extension.findOne({ identifier: id });
    if (existing) {
      return c.json({ success: true, message: "Extension already installed. Use reload to update." });
    }

    // デモ用にapi-test拡張機能の場合のみ処理
    if (id === "jp.takos.api-test") {
      const manifestStr = await loadExtensionFromLocal(id, "manifest.json");
      if (!manifestStr) throw new Error("manifest.json not found for api-test");
      const manifest = JSON.parse(manifestStr);

      const server = await loadExtensionFromLocal(id, "server.js");
      const client = await loadExtensionFromLocal(id, "client.js");
      const ui = await loadExtensionFromLocal(id, "index.html");

      const extension = new Extension({
        identifier: id,
        manifest,
        server: server || undefined,
        client: client || undefined,
        ui: ui || undefined,
        // icon はバイナリなので別途処理
      });

      await extension.save();
      await loadExtension(extension); // 新しくインストールした拡張機能をロード

      return c.json({ success: true, message: "Extension installed successfully" });
    }

    return c.json({ success: false, message: "Extension package not found" }, 404);
  } catch (error) {
    console.error("Failed to install extension:", error);
    return c.json({ success: false, message: `Installation failed: ${error.message}` }, 500);
  }
});

app.post("/api/extensions/:id/uninstall", async (c) => {
  const id = c.req.param("id");
  try {
    const result = await Extension.deleteOne({ identifier: id });
    if (result.deletedCount === 0) {
      return c.json({ success: false, message: "Extension not found" }, 404);
    }
    unloadExtension(id);
    return c.json({ success: true, message: "Extension uninstalled successfully" });
  } catch (error) {
    console.error(`Failed to uninstall extension ${id}:`, error);
    return c.json({ success: false, message: "Uninstallation failed" }, 500);
  }
});

app.post("/api/extensions/:id/reload", async (c) => {
  const id = c.req.param("id");
  try {
    const extension = await Extension.findOne({ identifier: id });
    if (!extension) {
      return c.json({ success: false, message: "Extension not found" }, 404);
    }
    // unloadExtension は loadExtension の中で呼ばれるので不要
    await loadExtension(extension);
    return c.json({ success: true, message: "Extension reloaded successfully" });
  } catch (error) {
    console.error(`Failed to reload extension ${id}:`, error);
    return c.json({ success: false, message: "Reload failed" }, 500);
  }
});

app.get("/api/extensions/:id/ui", async (c) => {
  const id = c.req.param("id");
  
  // データベースから取得を試行
  const ext = await Extension.findOne({ identifier: id });
  if (ext?.ui) {
    c.header("Content-Type", "text/html; charset=utf-8");
    const script = `<script>${initScript.replace("__EXTENSION_ID__", id)}</script>`;
    const html = ext.ui.includes("</head>")
      ? ext.ui.replace("</head>", script + "</head>")
      : script + ext.ui;
    return c.html(html);
  }

  // データベースにない場合、ローカルファイルから取得を試行
  const localUI = await loadExtensionFromLocal(id, "index.html");
  if (localUI) {
    c.header("Content-Type", "text/html; charset=utf-8");
    const script = `<script>${initScript.replace("__EXTENSION_ID__", id)}</script>`;
    const html = localUI.includes("</head>")
      ? localUI.replace("</head>", script + "</head>")
      : script + localUI;
    return c.html(html);
  }

  return c.notFound();
});

app.get("/api/extensions/:id/client.js", async (c) => {
  const id = c.req.param("id");
  
  // データベースから取得を試行
  const ext = await Extension.findOne({ identifier: id });
  if (ext?.client) {
    c.header("Content-Type", "application/javascript; charset=utf-8");
    c.header("Cache-Control", "no-store");
    return c.body(ext.client);
  }

  // データベースにない場合、ローカルファイルから取得を試行
  const localClient = await loadExtensionFromLocal(id, "client.js");
  if (localClient) {
    c.header("Content-Type", "application/javascript; charset=utf-8");
    c.header("Cache-Control", "no-store");
    return c.body(localClient);
  }

  return c.notFound();
});

app.get("/api/extensions/:id/server.js", async (c) => {
  const id = c.req.param("id");
  
  // データベースから取得を試行
  const ext = await Extension.findOne({ identifier: id });
  if (ext?.server) {
    c.header("Content-Type", "application/javascript; charset=utf-8");
    c.header("Cache-Control", "no-store");
    return c.body(ext.server);
  }

  // データベースにない場合、ローカルファイルから取得を試行
  const localServer = await loadExtensionFromLocal(id, "server.js");
  if (localServer) {
    c.header("Content-Type", "application/javascript; charset=utf-8");
    c.header("Cache-Control", "no-store");
    return c.body(localServer);
  }

  return c.notFound();
});

app.get("/api/extensions/:id/manifest.json", async (c) => {
  const id = c.req.param("id");
  
  // データベースから取得を試行
  const ext = await Extension.findOne({ identifier: id });
  if (ext?.manifest) {
    c.header("Content-Type", "application/json; charset=utf-8");
    return c.json(ext.manifest);
  }

  // データベースにない場合、ローカルファイルから取得を試行
  const localManifest = await loadExtensionFromLocal(id, "manifest.json");
  if (localManifest) {
    c.header("Content-Type", "application/json; charset=utf-8");
    return c.body(localManifest);
  }

  return c.notFound();
});

// 一般的なファイル取得エンドポイント（アイコンなど）
app.get("/api/extensions/:id/:filename", async (c) => {
  const id = c.req.param("id");
  const filename = c.req.param("filename");
  
  // データベースから取得を試行
  const ext = await Extension.findOne({ identifier: id });

  // ファイル名に基づいて適切なフィールドから取得
  let content: string | undefined;
  let contentType = "application/octet-stream";

  if (ext) {
    switch (filename) {
      case "icon.png":
      case "icon.jpg":
      case "icon.jpeg":
      case "icon.gif":
      case "icon.svg":
        content = ext.icon;
        if (filename.endsWith('.png')) contentType = "image/png";
        else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = "image/jpeg";
        else if (filename.endsWith('.gif')) contentType = "image/gif";
        else if (filename.endsWith('.svg')) contentType = "image/svg+xml";
        break;
      case "server.js":
        content = ext.server;
        contentType = "application/javascript; charset=utf-8";
        break;
      case "client.js":
        content = ext.client;
        contentType = "application/javascript; charset=utf-8";
        break;
      case "index.html":
        content = ext.ui;
        contentType = "text/html; charset=utf-8";
        break;
    }
  }

  // データベースに内容がない場合、ローカルファイルから取得を試行
  if (!content) {
    if (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg') || 
        filename.endsWith('.gif') || filename.endsWith('.svg')) {
      // バイナリファイルの場合
      const localBinary = await loadExtensionBinaryFromLocal(id, filename);
      if (localBinary) {
        if (filename.endsWith('.png')) contentType = "image/png";
        else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = "image/jpeg";
        else if (filename.endsWith('.gif')) contentType = "image/gif";
        else if (filename.endsWith('.svg')) contentType = "image/svg+xml";
        
        c.header("Content-Type", contentType);
        c.header("Cache-Control", "no-store");
        return c.body(localBinary);
      }
    } else {
      // テキストファイルの場合
      const localContent = await loadExtensionFromLocal(id, filename);
      if (localContent) {
        if (filename.endsWith('.js')) contentType = "application/javascript; charset=utf-8";
        else if (filename.endsWith('.html')) contentType = "text/html; charset=utf-8";
        
        c.header("Content-Type", contentType);
        c.header("Cache-Control", "no-store");
        return c.body(localContent);
      }
    }
  }

  if (!content) return c.notFound();
  
  c.header("Content-Type", contentType);
  c.header("Cache-Control", "no-store");
  return c.body(content);
});

export default app;
