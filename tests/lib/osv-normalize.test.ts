import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OsvQueryResponseSchema, normalizeOsv } from "../../src/lib/osv-normalize.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "../fixtures/osv");

async function loadFixture(name: string): Promise<unknown> {
  const text = await readFile(resolve(FIXTURES, name), "utf-8");
  return JSON.parse(text);
}

describe("normalizeOsv", () => {
  it("normaliza fixture lodash@4.17.11 preservando id, cve, severity, cvss, cwe, fixed_in, published e advisory_url", async () => {
    const raw = await loadFixture("lodash-4.17.11.json");
    const validated = OsvQueryResponseSchema.parse(raw);
    const report = normalizeOsv(validated, {
      name: "lodash",
      version: "4.17.11",
      ecosystem: "npm",
    });

    expect(report.package).toEqual({
      name: "lodash",
      version: "4.17.11",
      ecosystem: "npm",
    });
    expect(report.vulnerabilities).toHaveLength(7);

    const redos = report.vulnerabilities.find((v) => v.id === "GHSA-29mw-wpgm-hmr9");
    expect(redos).toEqual({
      id: "GHSA-29mw-wpgm-hmr9",
      cve: "CVE-2020-28500",
      summary: "Regular Expression Denial of Service (ReDoS) in lodash",
      severity: "MODERATE",
      cvss_vector: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L",
      cwe_ids: ["CWE-1333", "CWE-400"],
      fixed_in: "4.17.21",
      published: "2022-01-06T20:30:46Z",
      advisory_url: "https://nvd.nist.gov/vuln/detail/CVE-2020-28500",
    });
  });

  it("retorna cve null quando aliases nao contem identificador CVE-*", () => {
    const raw = OsvQueryResponseSchema.parse({
      vulns: [
        {
          id: "GHSA-only",
          aliases: ["GHSA-zzzz-yyyy-xxxx"],
          affected: [],
          references: [],
          severity: [],
          database_specific: { severity: "HIGH", cwe_ids: [] },
        },
      ],
    });
    const report = normalizeOsv(raw, { name: "x", version: "1.0.0", ecosystem: "npm" });
    expect(report.vulnerabilities[0]?.cve).toBeNull();
  });

  it("retorna severity UNKNOWN quando database_specific nao traz severity", () => {
    const raw = OsvQueryResponseSchema.parse({
      vulns: [
        {
          id: "GHSA-no-sev",
          aliases: [],
          affected: [],
          references: [],
          severity: [],
          database_specific: { cwe_ids: [] },
        },
      ],
    });
    const report = normalizeOsv(raw, { name: "x", version: "1.0.0", ecosystem: "npm" });
    expect(report.vulnerabilities[0]?.severity).toBe("UNKNOWN");
  });
});
