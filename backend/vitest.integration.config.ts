import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    include: ["src/**/*.integration.test.ts"],
    globalSetup: ["src/__tests__/support/postgres.global-setup.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
  },
});
