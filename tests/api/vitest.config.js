import { defineConfig } from 'vitest/config'
import base from '../../vitest.config.js'

// Kept so `npm run test:api` still works; the root vitest.config.js already includes these tests.
export default defineConfig({
  ...base,
  test: { ...base.test, include: ['tests/api/**/*.test.js'] },
})
