import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from '@tailwindcss/vite';
/*
// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [solid(), tailwindcss()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`

    },
  },
}));
*/
// https://vitejs.dev/config/
export default defineConfig({
    // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  server: {
    port: 1420, // ここでポートを指定
    strictPort: true, // 既に使われているポートならエラーにする
    host: true, // ホスト名を解決可能にする
    allowedHosts: ["dev.takos.jp", "localhost"],
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
        timeout: 5000,
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("プロキシエラー:", err.message);
          });
        },
      },
    },
  },
  css: {
    devSourcemap: false, // CSS ソースマップを無効化
  },
  build: {
    sourcemap: false, // ビルド時のソースマップを無効化
  },
  plugins: [
    solid(),
    tailwindcss(),
  ],
});