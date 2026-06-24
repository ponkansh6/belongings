import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    include: ["tests/**/*.test.tsx"],
    environment: "happy-dom",
    setupFiles: ["./tests/utils/ui-setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.d.ts"],
      reporter: ["text", "json", "html"],
    },
  },
});
