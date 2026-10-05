import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.BASE_URL
if (!baseURL) throw new Error('BASE_URL is required, e.g. BASE_URL=https://shipsafe-app.vercel.app')

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  timeout: 120_000,
  expect: { timeout: 90_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    // Lets CI reach a preview behind Vercel Deployment Protection; unset locally.
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET }
      : {},
    // Traces and videos can capture typed credentials, so keep them off.
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
})
