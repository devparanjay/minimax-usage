import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      include: [
        "src/api/client.ts",
        "src/api/classify.ts",
        "src/api/cache.ts",
        "src/api/retry.ts",
        "src/util/logger.ts",
        "src/polling/rateLimit.ts"
      ],
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100
      }
    }
  }
});
