// src/data/mockResults.js
// ─── Centralized mock/demo data ─────────────────────────
// Extracted from page components so they stay clean.
// These are shown to logged-out users as demo data.

export const MOCK_SCANS = [
  { id: 1, type: "debugger", title: "Express.js REST API", score: 22, issues: 9, time: "2 hours ago", color: "#ef4444" },
  { id: 2, type: "audit", title: "my-ai-app project", score: 35, issues: 17, time: "3 hours ago", color: "#f97316" },
  { id: 3, type: "loopholes", title: "Facial Recognition System", score: 72, issues: 4, time: "5 hours ago", color: "#a855f7" },
  { id: 4, type: "deploy-check", title: "Vercel + Supabase config", score: 45, issues: 6, time: "1 day ago", color: "#22c55e" },
  { id: 5, type: "stress-test", title: "Vercel free tier stack", score: null, issues: 3, time: "1 day ago", color: "#eab308" },
]

export const SCAN_COLORS = {
  debugger: "#ef4444",
  audit: "#f97316",
  loopholes: "#a855f7",
  "deploy-check": "#22c55e",
  "stress-test": "#eab308",
}

export const mockRegulationResult = {
  topic: "Deepfakes",
  regulations: [
    {
      name: "EU AI Act — Deepfake Disclosure Requirement",
      country: "European Union",
      year: 2024,
      status: "Active",
      summary: "Article 50 of the EU AI Act requires deployers of AI systems that generate synthetic media to label outputs as AI-generated. Applies to text, audio, image, and video deepfakes distributed to the public.",
      source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689",
      sectors: ["Media", "Social Platforms", "Advertising", "Entertainment"],
      risk: {
        description: "Fines up to €15M or 3% of global annual turnover for failure to label AI-generated content.",
        severity: "High",
        who_is_at_risk: ["Developers of image/video generation tools", "Social media platforms", "Ad-tech companies"],
      },
      developer_checklist: [
        "Embed machine-readable watermark (e.g. C2PA metadata) in every AI-generated image or video",
        "Display visible 'AI-generated' label in UI wherever synthetic media appears",
        "Log generation events with timestamp and model version for audit purposes",
        "Provide API endpoint for third parties to verify content authenticity",
      ],
    },
    {
      name: "UK Online Safety Act",
      country: "United Kingdom",
      year: 2023,
      status: "Active",
      summary: "Requires platforms to proactively identify and remove non-consensual intimate deepfake imagery and prevent its spread. Ofcom can fine platforms up to £18M or 10% of global revenue.",
      source_url: "https://www.legislation.gov.uk/ukpga/2023/50/contents",
      sectors: ["Social Platforms", "Cloud Storage", "Messaging", "Adult Content"],
      risk: {
        description: "Fines up to £18M or 10% of global annual revenue; senior managers can face criminal liability.",
        severity: "High",
        who_is_at_risk: ["User-generated content platforms", "File hosting services", "Messaging apps with media sharing"],
      },
      developer_checklist: [
        "Integrate perceptual hash matching (e.g. PhotoDNA) to detect known NCII deepfakes at upload",
        "Build user reporting flow for synthetic intimate imagery with <24h review SLA",
        "Block re-upload of removed content using hash blocklist",
        "Publish annual transparency report with deepfake takedown counts",
      ],
    },
  ],
  country_coverage: {
    regulated: ["European Union", "United Kingdom"],
    draft: ["United States", "Canada", "Australia"],
    unregulated: ["Brazil", "India", "Japan", "South Korea"],
  },
  overall_severity: "High",
}

export const MOCK_REGULATIONS = [
  {
    name: "EU AI Act",
    country: "European Union",
    year: 2024,
    status: "Enacted",
    summary: "Comprehensive risk-based framework for AI systems operating in or affecting the EU. Bans certain AI uses, imposes strict obligations on high-risk systems.",
    source_url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689",
    sectors: ["Healthcare", "Finance", "Law Enforcement", "Education"],
    risk: {
      description: "Non-compliance fines up to €35M or 7% of global annual turnover.",
      severity: "High",
      who_is_at_risk: ["AI developers", "Deployers of high-risk AI", "Importers and distributors"],
    },
    developer_checklist: [
      "Classify your AI system by risk level (unacceptable / high / limited / minimal)",
      "Implement conformity assessment for high-risk systems",
      "Maintain technical documentation and logs",
      "Register high-risk systems in EU database before deployment",
    ],
  },
  {
    name: "NIST AI Risk Management Framework",
    country: "United States",
    year: 2023,
    status: "Active",
    summary: "Voluntary framework for managing AI risks across the AI lifecycle. Covers governance, mapping, measuring, and managing AI risks.",
    source_url: "https://www.nist.gov/system/files/documents/2023/01/26/AI%20RMF%20Playbook.pdf",
    sectors: ["All sectors"],
    risk: {
      description: "Voluntary — no direct penalties, but non-adoption may indicate negligence in litigation.",
      severity: "Low",
      who_is_at_risk: ["Organizations deploying AI in regulated industries"],
    },
    developer_checklist: [
      "Adopt GOVERN, MAP, MEASURE, MANAGE functions",
      "Document AI system purpose, limitations, and intended users",
      "Establish AI incident response procedures",
    ],
  },
  {
    name: "India Digital Personal Data Protection Act",
    country: "India",
    year: 2023,
    status: "Enacted",
    summary: "Governs processing of digital personal data in India. AI systems that process personal data must comply with consent, purpose limitation, and data minimization rules.",
    source_url: "https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf",
    sectors: ["Technology", "Finance", "Healthcare", "E-commerce"],
    risk: {
      description: "Penalties up to ₹250 crore (~$30M USD) per violation.",
      severity: "High",
      who_is_at_risk: ["Data fiduciaries", "Data processors", "AI apps processing Indian user data"],
    },
    developer_checklist: [
      "Obtain explicit consent before processing personal data",
      "Implement data minimization in training pipelines",
      "Appoint a Data Protection Officer if processing at scale",
      "Establish user rights: access, correction, erasure",
    ],
  },
]
