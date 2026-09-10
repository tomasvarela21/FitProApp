import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 15000,
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.integration.test.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
  },
});
