import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  server: {
    allowedHosts: ["dev1.takos.jp", "dev2.takos.jp"],
  },
});
