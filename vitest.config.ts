import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    // The components ship their test helpers as TypeScript that uses import.meta.glob.
    server: { deps: { inline: ["convex-test", "@convex-dev/rate-limiter", "@convex-dev/batch-worker"] } },
  },
});
