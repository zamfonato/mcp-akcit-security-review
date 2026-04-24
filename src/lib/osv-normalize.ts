import { z } from "zod";

export const OsvVulnSchema = z.object({
  id: z.string(),
  summary: z.string().optional().default(""),
  published: z.string().optional(),
  aliases: z.array(z.string()).optional().default([]),
  references: z
    .array(
      z.object({
        type: z.string(),
        url: z.string(),
      }),
    )
    .optional()
    .default([]),
  severity: z
    .array(
      z.object({
        type: z.string(),
        score: z.string(),
      }),
    )
    .optional()
    .default([]),
  affected: z
    .array(
      z.object({
        package: z.object({
          name: z.string(),
          ecosystem: z.string(),
        }),
        ranges: z
          .array(
            z.object({
              events: z.array(z.record(z.string(), z.string())),
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .optional()
    .default([]),
  database_specific: z
    .object({
      severity: z.string().optional(),
      cwe_ids: z.array(z.string()).optional(),
    })
    .optional()
    .default({}),
});

export const OsvQueryResponseSchema = z.object({
  vulns: z.array(OsvVulnSchema).optional().default([]),
});

export type OsvQueryResponse = z.infer<typeof OsvQueryResponseSchema>;
type OsvVuln = z.infer<typeof OsvVulnSchema>;

const SEVERITY_VALUES = ["LOW", "MODERATE", "HIGH", "CRITICAL", "UNKNOWN"] as const;
export type Severity = (typeof SEVERITY_VALUES)[number];

export interface NormalizedVuln {
  id: string;
  cve: string | null;
  summary: string;
  severity: Severity;
  cvss_vector: string | null;
  cwe_ids: string[];
  fixed_in: string | null;
  published: string | null;
  advisory_url: string | null;
}

export interface QueriedPackage {
  name: string;
  version: string;
  ecosystem: "npm";
}

export interface NormalizedReport {
  package: QueriedPackage;
  vulnerabilities: NormalizedVuln[];
}

const CVE_REGEX = /^CVE-/i;

function pickCve(aliases: readonly string[]): string | null {
  return aliases.find((a) => CVE_REGEX.test(a)) ?? null;
}

function pickSeverity(databaseSpecific: OsvVuln["database_specific"]): Severity {
  const raw = databaseSpecific.severity?.toUpperCase();
  if (raw === undefined) return "UNKNOWN";
  for (const v of SEVERITY_VALUES) {
    if (v === raw) return v;
  }
  return "UNKNOWN";
}

function pickCvss(severity: OsvVuln["severity"]): string | null {
  const hit = severity.find((s) => s.type === "CVSS_V3" || s.type === "CVSS_V4");
  return hit?.score ?? null;
}

function pickFixedIn(
  affected: OsvVuln["affected"],
  pkgName: string,
  ecosystem: string,
): string | null {
  for (const a of affected) {
    if (a.package.name !== pkgName || a.package.ecosystem !== ecosystem) continue;
    for (const r of a.ranges) {
      for (const ev of r.events) {
        const fixed = ev["fixed"];
        if (typeof fixed === "string") return fixed;
      }
    }
  }
  return null;
}

function pickAdvisoryUrl(references: OsvVuln["references"]): string | null {
  const advisory = references.find((r) => r.type === "ADVISORY");
  if (advisory) return advisory.url;
  return references[0]?.url ?? null;
}

export function normalizeOsv(
  raw: OsvQueryResponse,
  pkg: QueriedPackage,
): NormalizedReport {
  const vulnerabilities: NormalizedVuln[] = raw.vulns.map((v) => ({
    id: v.id,
    cve: pickCve(v.aliases),
    summary: v.summary,
    severity: pickSeverity(v.database_specific),
    cvss_vector: pickCvss(v.severity),
    cwe_ids: v.database_specific.cwe_ids ?? [],
    fixed_in: pickFixedIn(v.affected, pkg.name, pkg.ecosystem),
    published: v.published ?? null,
    advisory_url: pickAdvisoryUrl(v.references),
  }));
  return { package: pkg, vulnerabilities };
}
