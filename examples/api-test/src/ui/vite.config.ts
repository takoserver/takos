import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => {
  return {
    plugins: [solid(), viteSingleFile()],
    server: {
      port: 3001,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      target: 'es2022',
      outDir: 'dist',
      sourcemap: false,
      assetsInlineLimit: 100000000, // 100MB - 全てのアセットをインライン化
      rollupOptions: {
        output: isSsrBuild ? {} : {
          inlineDynamicImports: true,
          manualChunks: undefined, // チャンクを無効化して単一ファイル出力
        },
      },
    },
    optimizeDeps: {
      include: ['solid-js'],
    },
  }
})
