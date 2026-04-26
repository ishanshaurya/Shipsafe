// api/github.js — Vercel Serverless Function (v2)
// Uses Git Trees API for full recursive repo scanning

const CODE_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".go", ".rs",
  ".rb", ".php", ".c", ".cpp", ".cs", ".swift", ".kt",
  ".vue", ".svelte", ".mjs", ".cjs", ".graphql", ".gql",
  ".sql", ".sh", ".bash", ".proto", ".dart", ".scala", ".ex", ".exs"
]

const CONFIG_FILES = [
  "package.json", "tsconfig.json", "vite.config.js", "vite.config.ts",
  "next.config.js", "next.config.mjs", ".env.example", "vercel.json",
  "Dockerfile", "docker-compose.yml", "requirements.txt", "Cargo.toml",
  "go.mod", "Gemfile", ".eslintrc", ".eslintrc.js", ".eslintrc.json",
  "tailwind.config.js", "postcss.config.js", "jest.config.js",
  "jest.config.ts", "webpack.config.js", "babel.config.json",
  ".prettierrc", "pyproject.toml", "nx.json", "turbo.json",
  "railway.json", "render.yaml", ".github/workflows"
]

const SKIP_PATHS = [
  "node_modules/", "dist/", "build/", ".next/", ".nuxt/",
  "coverage/", ".git/", "vendor/", "__pycache__/", ".pytest_cache/"
]

const SKIP_FILES = [
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "composer.lock"
]

const MAX_FILES = 25
const MAX_FILE_SIZE = 60000 // 60KB

function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") }
}

async function githubFetch(path, token) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ShipSafe-Scanner",
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`https://api.github.com${path}`, { headers })

  if (res.status === 403) {
    const remaining = res.headers.get("x-ratelimit-remaining")
    if (remaining === "0") {
      throw new Error("GitHub API rate limit exceeded. Try again in a few minutes.")
    }
    throw new Error("GitHub API access forbidden.")
  }

  if (res.status === 404) {
    throw new Error("Repository not found or is private.")
  }

  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status}`)
  }

  return res.json()
}

function shouldIncludeFile(item) {
  if (item.type !== "blob") return false
  if (item.size > MAX_FILE_SIZE) return false

  const name = item.path.split("/").pop().toLowerCase()
  const path = item.path.toLowerCase()

  if (SKIP_FILES.includes(name)) return false
  if (SKIP_PATHS.some((s) => path.includes(s))) return false
  if (name.includes(".min.")) return false
  if (name.startsWith(".") && !CONFIG_FILES.includes(name)) return false

  if (CONFIG_FILES.some((c) => name === c || path.endsWith(c))) return true

  return CODE_EXTENSIONS.some((ext) => name.endsWith(ext))
}

function smartSelect(allFiles) {
  const configs = allFiles.filter((f) => {
    const name = f.path.split("/").pop().toLowerCase()
    return CONFIG_FILES.some((c) => name === c || f.path.toLowerCase().endsWith(c))
  })

  const source = allFiles.filter((f) => {
    const name = f.path.split("/").pop().toLowerCase()
    return !CONFIG_FILES.some((c) => name === c)
  })

  // Group source files by top-level directory
  const byDir = {}
  for (const f of source) {
    const topDir = f.path.includes("/") ? f.path.split("/")[0] : "__root__"
    if (!byDir[topDir]) byDir[topDir] = []
    byDir[topDir].push(f)
  }

  // Sort each dir's files by size descending (larger = more to scan)
  for (const dir of Object.values(byDir)) {
    dir.sort((a, b) => b.size - a.size)
  }

  // Round-robin across directories to spread coverage
  const spread = []
  const dirs = Object.values(byDir)
  let i = 0
  const budget = MAX_FILES - configs.length
  while (spread.length < budget && dirs.some((d) => d.length > 0)) {
    const dir = dirs[i % dirs.length]
    if (dir.length > 0) spread.push(dir.shift())
    i++
  }

  return [...configs, ...spread].slice(0, MAX_FILES)
}

async function fetchFileContent(path, owner, repo, token) {
  try {
    const data = await githubFetch(`/repos/${owner}/${repo}/contents/${path}`, token)
    if (data.encoding === "base64" && data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8")
    }
    return null
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { url } = req.body
  if (!url || !url.trim()) {
    return res.status(400).json({ error: "No GitHub URL provided" })
  }

  const parsed = parseGitHubUrl(url)
  if (!parsed) {
    return res.status(400).json({ error: "Invalid GitHub URL. Use: https://github.com/owner/repo" })
  }

  const token = process.env.GITHUB_TOKEN || null

  try {
    // Step 1: Get repo metadata
    const repoData = await githubFetch(`/repos/${parsed.owner}/${parsed.repo}`, token)

    // Step 2: Get default branch
    const defaultBranch = repoData.default_branch || "main"

    // Step 3: ONE call — full recursive file tree via Git Trees API
    const treeData = await githubFetch(
      `/repos/${parsed.owner}/${parsed.repo}/git/trees/${defaultBranch}?recursive=1`,
      token
    )

    if (!treeData.tree || treeData.tree.length === 0) {
      return res.status(404).json({ error: "Repository appears to be empty." })
    }

    // Step 4: Filter to scannable files
    const allFiles = treeData.tree
      .filter(shouldIncludeFile)
      .map((item) => ({ path: item.path, size: item.size }))

    if (allFiles.length === 0) {
      return res.status(404).json({ error: "No scannable source files found in this repo." })
    }

    // Step 5: Smart selection — spread across directories
    const selected = smartSelect(allFiles)

    // Step 6: Fetch file contents (sequential to respect rate limits)
    const files = []
    for (const item of selected) {
      const content = await fetchFileContent(item.path, parsed.owner, parsed.repo, token)
      if (content) {
        files.push({ path: item.path, content })
      }
    }

    if (files.length === 0) {
      return res.status(404).json({ error: "Could not read any file contents from this repo." })
    }

    // Step 7: Combine
    const combined = files
      .map((f) => `// === ${f.path} ===\n${f.content}`)
      .join("\n\n")

    return res.status(200).json({
      repo: {
        name: repoData.full_name,
        description: repoData.description,
        language: repoData.language,
        stars: repoData.stargazers_count,
        url: repoData.html_url,
      },
      files: files.map((f) => f.path),
      fileCount: files.length,
      totalLines: combined.split("\n").length,
      code: combined,
    })
  } catch (err) {
    console.error("GitHub fetch error:", err)
    return res.status(502).json({ error: err.message || "Failed to fetch repo" })
  }
}
