import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger(), mcpPlugin()].filter(Boolean),
  // The rythmo transcription worker is a module worker (`type: 'module'`) and
  // loads the Whisper runtime through a dynamic import. Vite's default worker
  // format is `iife`, which forbids code-splitting, so the format has to match
  // the worker we actually instantiate.
  worker: {
    format: "es",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Pre-bundling the ONNX runtime is slow and unnecessary: it is only ever
    // reached from inside the worker chunk.
    exclude: ["@huggingface/transformers"],
  },
}));
