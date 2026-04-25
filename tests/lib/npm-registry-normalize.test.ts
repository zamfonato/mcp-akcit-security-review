import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  NpmManifestSchema,
  normalizeNpmManifest,
} from "../../src/lib/npm-registry-normalize.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "../fixtures/npm");

async function loadFixture(name: string): Promise<unknown> {
  const text = await readFile(resolve(FIXTURES, name), "utf-8");
  return JSON.parse(text);
}

describe("normalizeNpmManifest", () => {
  it("normaliza fixture lodash@latest preservando version, license, homepage e repository_url (sem prefixo git+)", async () => {
    const raw = await loadFixture("lodash-latest.json");
    const validated = NpmManifestSchema.parse(raw);
    const report = normalizeNpmManifest(validated, { name: "lodash", ecosystem: "npm" });
    expect(report).toEqual({
      package: { name: "lodash", ecosystem: "npm" },
      latest_version: "4.18.1",
      is_deprecated: false,
      deprecation_message: null,
      license: "MIT",
      homepage: "https://lodash.com/",
      repository_url: "https://github.com/lodash/lodash.git",
    });
  });

  it("retorna repository_url null quando manifest nao tem repository", () => {
    const raw = NpmManifestSchema.parse({
      name: "minha-lib",
      version: "1.0.0",
      license: "ISC",
      homepage: "https://example.com",
    });
    const report = normalizeNpmManifest(raw, { name: "minha-lib", ecosystem: "npm" });
    expect(report.repository_url).toBeNull();
    expect(report.license).toBe("ISC");
    expect(report.homepage).toBe("https://example.com");
  });

  it("sinaliza is_deprecated true e preserva deprecation_message quando manifest traz deprecated", async () => {
    const raw = await loadFixture("deprecated-package.json");
    const validated = NpmManifestSchema.parse(raw);
    const report = normalizeNpmManifest(validated, { name: "request", ecosystem: "npm" });
    expect(report.is_deprecated).toBe(true);
    expect(report.deprecation_message).toBe(
      "request has been deprecated, see https://github.com/request/request/issues/3142",
    );
    expect(report.latest_version).toBe("2.88.2");
  });
});
