import { test, expect } from './fixtures.js'

const verdict = (page) => page.getByRole('region', { name: 'Verdict' })

test('sign in lands on the dashboard', async ({ authedPage }) => {
  await expect(authedPage).toHaveURL(/\/dashboard$/)
})

test('debugger reviews pasted code and shares a report', async ({ authedPage: page, browser, baseURL }) => {
  await page.goto('/debugger')
  await page.getByLabel('Code').fill('app.get("/u", (req, res) => db.query("SELECT * FROM u WHERE id=" + req.query.id, (e, r) => res.json(r)))')
  await page.getByRole('button', { name: 'Run review' }).click()
  await expect(verdict(page)).toBeVisible()

  await page.getByRole('button', { name: 'Create report link' }).click()
  const link = await page.getByLabel('Report link').inputValue()
  expect(link).toContain('/report/')

  // A signed-out visitor must be able to open the shared report.
  const anon = await browser.newContext({ baseURL })
  const anonPage = await anon.newPage()
  await anonPage.goto(new URL(link).pathname)
  await expect(anonPage.getByRole('heading', { level: 1 })).not.toHaveText('Report not found')
  await expect(anonPage.getByRole('heading', { level: 1 })).toBeVisible()
  await anon.close()
})

test('audit reviews a small project', async ({ authedPage: page }) => {
  await page.goto('/audit')
  await page.getByLabel('Project files').fill('// package.json\n{"dependencies":{"express":"4.0.0"}}\n// server.js\nconst app = require("express")(); app.get("/", (q, r) => r.send(q.query.x)); app.listen(3000)')
  await page.getByRole('button', { name: 'Run audit' }).click()
  await expect(verdict(page)).toBeVisible()
})

test('loophole finder analyses a described system', async ({ authedPage: page }) => {
  await page.goto('/loopholes')
  await page.getByLabel('Describe your AI system').fill('A chatbot that screens job applicants and ranks resumes automatically')
  await page.getByRole('button', { name: 'European Union' }).click()
  await page.getByRole('button', { name: 'Find loopholes' }).click()
  await expect(verdict(page)).toBeVisible()
})

test('regulations search returns a checklist', async ({ authedPage: page }) => {
  await page.goto('/regulations')
  await page.getByLabel('Search regulations').fill('GDPR')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Copy checklist' })).toBeVisible()
})

test('debugger imports a public GitHub repo', async ({ authedPage: page }) => {
  await page.goto('/debugger')
  await page.getByLabel('Import from GitHub').fill('https://github.com/octocat/Hello-World')
  await page.getByRole('button', { name: 'Import recommended files without choosing' }).click()
  await expect(page.getByLabel('Code')).not.toHaveValue('')
})
