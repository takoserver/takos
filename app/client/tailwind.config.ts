import type { Config } from "npm:tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#181818",
      },
    },
  },
  plugins: [],
} satisfies Config;
