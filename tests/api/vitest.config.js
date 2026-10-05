import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

// Separate from vite.config.js (owned by lane A); `npm test` runs both.
export default defineConfig({
  root: fileURLToPath(new URL("../..", import.meta.url)),
  test: {
    environment: "node",
    include: ["tests/api/**/*.test.js"],
  },
})
