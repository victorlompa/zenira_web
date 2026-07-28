import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // the pipeline core lives in ../src, outside this Vite project's root
    fs: { allow: [path.resolve(__dirname, "..")] },
    headers: {
      // required for cross-origin isolation, which some WASM STT builds (Vosk) need
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
