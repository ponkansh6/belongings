import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "./node_modules/.cache/vitest",
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    root: "./",
    pool: "threads",
    server: {
      deps: {
        inline: ["@reduxjs/toolkit"],
      },
    },
    onConsoleLog(log) {
      if (log.includes("Loader error") || log.includes("Data files not found")) return false;
    },
    projects: [
      {
        extends: true,
        test: {
          name: "logic",
          include: ["tests/**/*.test.ts"],
          environment: "node",
          setupFiles: ["./tests/utils/logic-setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          include: ["tests/**/*.test.tsx"],
          environment: "happy-dom",
          setupFiles: ["./tests/utils/ui-setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/components/**/*.{ts,tsx}", "src/hooks/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
      exclude: [
        "src/lib/types.ts",
        "src/**/*.d.ts",
        // Next.js framework entrypoints are validated separately, outside Vitest unit coverage.
        "src/app/page.tsx",
        "src/app/layout.tsx",
      ],
      thresholds: {
        lines: 100,
        statements: 100,
        functions: 100,
        branches: 100,
        autoUpdate: false,
      },
      reporter: ["text", "json-summary"],
    },
  },
});
