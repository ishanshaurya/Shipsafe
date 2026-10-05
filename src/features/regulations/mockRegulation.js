// Sample result shown (and flagged to the user) when a live regulation query fails.

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
