import { test, expect } from '@playwright/test'

const routes = {
  '/api/gemini': { tool: 'debugger', userPrompt: 'x' },
  '/api/github': { url: 'https://github.com/octocat/Hello-World' },
  '/api/embed': { action: 'generate', text: 'x' },
}

for (const [path, data] of Object.entries(routes)) {
  test(`${path} without a token returns 401`, async ({ request }) => {
    const res = await request.post(path, { data })
    expect(res.status()).toBe(401)
    expect(await res.json()).toEqual({ error: 'Sign in required' })
  })

  test(`${path} with a bogus token returns 401`, async ({ request }) => {
    const res = await request.post(path, { data, headers: { Authorization: 'Bearer not-a-real-token' } })
    expect(res.status()).toBe(401)
  })
}
