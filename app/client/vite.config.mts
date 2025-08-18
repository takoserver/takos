import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import process from "node:process";

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
      allow: [
        // 現在のプロジェクトディレクトリ
        ".",
        // 共有のmls-wasmディレクトリ
        "../shared/mls-wasm",
        // ルートディレクトリからの相対パス
        "../../app/shared/mls-wasm"
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
