import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import process from "node:process";
import path from "node:path";

export default defineConfig({
  plugins: [
    solid(),
    tailwindcss(),
    VitePWA({ registerType: "autoUpdate" }),
    // WASM サポート用のカスタムプラグイン
    {
      name: "wasm-support",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          }
          next();
        });
      },
    },
  ],

  server: {
    host: "0.0.0.0",
    port: 1420,
    strictPort: true,
    fs: {
      // use absolute resolved paths so Vite accepts requests on Windows and other platforms
      allow: [
        // 現在のプロジェクトディレクトリ
        path.resolve(__dirname, "."),
        // openmls-wasm 配下の .wasm ファイルを許可するためのパス
        path.resolve(__dirname, "../shared/openmls-wasm"),
        // ルートから見た相対パスの保険
        path.resolve(__dirname, "../../app/shared/mls-wasm")
      ]
    }
  },

  envPrefix: ["VITE_", "TAURI_"],

  build: {
    target: process.env.TAURI_PLATFORM ? "es2021" : "esnext",
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      external: [],
    },
  },

  // WASM ファイルのサポート
  assetsInclude: ["**/*.wasm"],

  // 最適化の設定
  optimizeDeps: {
    exclude: ["../../../../shared/mls-wasm/pkg/mls_wasm.js"],
  },
});
