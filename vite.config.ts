// Static SPA build (GitHub Pages friendly). The original Lovable/TanStack-Start (SSR, Cloudflare)
// config was replaced because it needs a server runtime.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // Relative base: works under https://user.github.io/<repo>/ and on any static host.
  base: "./",
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  build: { outDir: "dist", sourcemap: false },
});
