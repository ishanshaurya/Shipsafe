// api/github.js — Vercel Serverless Function
// Fetches source files from a public GitHub repo for scanning.
//
// Flow: Frontend → POST /api/github → GitHub API → returns combined source code
//
// Supports: public repos (no auth needed), private repos (with GITHUB_TOKEN env var)
// Rate limits: 60 req/hr without token, 5000 req/hr with token

// File extensions we care about for code scanning
const CODE_EXTENSIONS = [
  ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".go", ".rs",
  ".rb", ".php", ".c", ".cpp", ".cs", ".swift", ".kt",
]

const CONFIG_FILES = [
  "package.json", "tsconfig.json", "vite.config.js", "vite.config.ts",
  "next.config.js", "next.config.mjs", ".env.example", "vercel.json",
  "Dockerfile", "docker-compose.yml", "requirements.txt", "Cargo.toml",
  "go.mod", "Gemfile", ".eslintrc", ".eslintrc.js", ".eslintrc.json",
  "tailwind.config.js", "postcss.config.js",
]

// Max files to fetch (GitHub API rate limit protection)
const MAX_FILES = 15
// Max file size in bytes (skip huge files)
const MAX_FILE_SIZE = 50000 // 50KB

function parseGitHubUrl(url) {
  // Handles: github.com/owner/repo, github.com/owner/repo/tree/branch/path
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
  }

  if (!res.ok) {
    throw new Error(`GitHub API returned ${res.status}`)
  }

  return res.json()
}

function shouldIncludeFile(item) {
  if (item.type !== "file") return false
  if (item.size > MAX_FILE_SIZE) return false

  const name = item.name.toLowerCase()
  const path = item.path.toLowerCase()

  // Skip test files, node_modules, build output, lock files
  if (path.includes("node_modules/")) return false
  if (path.includes("dist/")) return false
  if (path.includes("build/")) return false
  if (path.includes(".min.")) return false
  if (name === "package-lock.json" || name === "yarn.lock" || name === "pnpm-lock.yaml") return false

  // Include config files
  if (CONFIG_FILES.includes(name)) return true

  // Include source code files
  return CODE_EXTENSIONS.some((ext) => name.endsWith(ext))
}

async function fetchFileContent(item, token) {
  try {
    const data = await githubFetch(`/repos/${item.full_path}`, token)
    if (data.encoding === "base64" && data.content) {
      return Buffer.from(data.content, "base64").toString("utf-8")
    }
    return null
  } catch {
    return null // Skip files that fail to fetch
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
    return res.status(400).json({ error: "Invalid GitHub URL. Expected: github.com/owner/repo" })
  }

  const token = process.env.GITHUB_TOKEN || null

  try {
    // Step 1: Get repo info
    const repo = await githubFetch(`/repos/${parsed.owner}/${parsed.repo}`, token)

    // Step 2: Get file tree (recursive, top-level + src/ + app/ + lib/)
    const paths = ["", "/src", "/app", "/lib", "/server", "/api", "/pages", "/components"]
    const allFiles = []

    for (const dir of paths) {
      try {
        const contents = await githubFetch(
          `/repos/${parsed.owner}/${parsed.repo}/contents${dir}`,
          token
        )
        if (Array.isArray(contents)) {
          for (const item of contents) {
            if (shouldIncludeFile(item)) {
              allFiles.push({
                name: item.name,
                path: item.path,
                size: item.size,
                full_path: `${parsed.owner}/${parsed.repo}/contents/${item.path}`,
              })
            }
          }
        }
      } catch {
        // Directory doesn't exist — skip
      }
    }

    // Step 3: Prioritize files — configs first, then source by size
    const configs = allFiles.filter((f) => CONFIG_FILES.includes(f.name))
    const source = allFiles
      .filter((f) => !CONFIG_FILES.includes(f.name))
      .sort((a, b) => b.size - a.size) // Larger files first (more to scan)

    const selected = [...configs, ...source].slice(0, MAX_FILES)

    // Step 4: Fetch file contents
    const files = []
    for (const item of selected) {
      const content = await fetchFileContent(item, token)
      if (content) {
        files.push({ path: item.path, content })
      }
    }

    if (files.length === 0) {
      return res.status(404).json({ error: "No scannable source files found in this repo" })
    }

    // Step 5: Combine into a single code block for scanning
    const combined = files
      .map((f) => `// === ${f.path} ===\n${f.content}`)
      .join("\n\n")

    return res.status(200).json({
      repo: {
        name: repo.full_name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        url: repo.html_url,
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
