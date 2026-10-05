import { test as base, expect } from '@playwright/test'

const { E2E_EMAIL, E2E_PASSWORD, E2E_STRIP_AUTH } = process.env

export async function signIn(page) {
  if (!E2E_EMAIL || !E2E_PASSWORD) throw new Error('E2E_EMAIL and E2E_PASSWORD must be set in the shell')
  await page.goto('/login')
  await page.getByLabel('Email').fill(E2E_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL('**/dashboard')
}

// Credentials stay in env vars and sessions stay in memory: no storageState file is written.
export const test = base.extend({
  authedPage: async ({ page }, use) => {
    await signIn(page)
    // Negative control: E2E_STRIP_AUTH=1 removes the token from every API call; the suite must then fail.
    if (E2E_STRIP_AUTH) {
      await page.route('**/api/**', (route) => {
        const headers = { ...route.request().headers() }
        delete headers.authorization
        return route.continue({ headers })
      })
    }
    await use(page)
  },
})

export { expect }
