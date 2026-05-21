import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Vitest is invoked via `npm run test` (vitest --run) or `npm run test:watch`.
// `vite build` does NOT call this config; CI runs vitest separately.
// This file is intentionally separate from vite.config.ts so build behavior is unchanged.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/*.{test,spec,pbt.test}.{ts,tsx}",
      "src/**/__tests__/**/*.{test,spec,pbt.test}.{ts,tsx}",
    ],
  },
});
