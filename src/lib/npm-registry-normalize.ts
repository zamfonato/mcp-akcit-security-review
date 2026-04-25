import { z } from "zod";

const LicenseSchema = z.union([z.string(), z.object({ type: z.string() })]);

const RepositorySchema = z.union([
  z.string(),
  z.object({ url: z.string().optional() }),
]);

export const NpmManifestSchema = z.object({
  name: z.string(),
  version: z.string(),
  deprecated: z.string().optional(),
  license: LicenseSchema.optional(),
  homepage: z.string().optional(),
  repository: RepositorySchema.optional(),
});

export type NpmManifest = z.infer<typeof NpmManifestSchema>;

export interface QueriedPackage {
  name: string;
  ecosystem: "npm";
}

export interface LatestVersionReport {
  package: QueriedPackage;
  latest_version: string;
  is_deprecated: boolean;
  deprecation_message: string | null;
  license: string | null;
  homepage: string | null;
  repository_url: string | null;
}

function extractLicense(l: NpmManifest["license"]): string | null {
  if (l === undefined) return null;
  if (typeof l === "string") return l;
  return l.type;
}

function extractRepoUrl(r: NpmManifest["repository"]): string | null {
  if (r === undefined) return null;
  let raw: string | undefined;
  if (typeof r === "string") {
    raw = r;
  } else if (typeof r.url === "string") {
    raw = r.url;
  }
  if (raw === undefined) return null;
  return raw.replace(/^git\+/, "");
}

export function normalizeNpmManifest(
  raw: NpmManifest,
  pkg: QueriedPackage,
): LatestVersionReport {
  const dep = raw.deprecated;
  return {
    package: pkg,
    latest_version: raw.version,
    is_deprecated: typeof dep === "string" && dep.length > 0,
    deprecation_message: dep ?? null,
    license: extractLicense(raw.license),
    homepage: raw.homepage ?? null,
    repository_url: extractRepoUrl(raw.repository),
  };
}
