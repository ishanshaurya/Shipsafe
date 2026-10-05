import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// One config for frontend (src/) and API (tests/api/) tests; vitest prefers this file over vite.config.js.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'tests/api/**/*.test.js'],
  },
})
