import { defineConfig } from "@playwright/test";

export default defineConfig({
  webServer: {
    command: "pnpm dev",
    port: 3000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:3000",
  },
  testMatch: "tests/**/*.spec.ts",
  timeout: 15_000,
});
