import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchVulnerabilities } from "../../src/tools/fetch-vulnerabilities.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "../fixtures/osv");

const FROZEN_NOW = new Date("2026-04-24T17:40:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_NOW);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchVulnerabilities", () => {
  it("happy path: retorna relatorio normalizado com queried_at deterministico", async () => {
    const fixture = await readFile(resolve(FIXTURES, "lodash-4.17.11.json"), "utf-8");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(fixture, { status: 200 })),
    );

    const result = await fetchVulnerabilities({
      name: "lodash",
      version: "4.17.11",
      ecosystem: "npm",
    });

    expect("isError" in result).toBe(false);
    if ("isError" in result) return;
    expect(result.queried_at).toBe(FROZEN_NOW.toISOString());
    expect(result.package).toEqual({
      name: "lodash",
      version: "4.17.11",
      ecosystem: "npm",
    });
    expect(result.vulnerabilities).toHaveLength(7);
    const redos = result.vulnerabilities.find((v) => v.id === "GHSA-29mw-wpgm-hmr9");
    expect(redos?.cve).toBe("CVE-2020-28500");
    expect(redos?.fixed_in).toBe("4.17.21");
  });

  it("zero vulns: OSV retorna {} e tool devolve vulnerabilities vazia", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 200 })),
    );

    const result = await fetchVulnerabilities({
      name: "pacote-inexistente",
      version: "1.0.0",
      ecosystem: "npm",
    });

    expect("isError" in result).toBe(false);
    if ("isError" in result) return;
    expect(result.vulnerabilities).toEqual([]);
    expect(result.queried_at).toBe(FROZEN_NOW.toISOString());
  });

  it("HTTP 400: retorna erro de dominio em portugues citando status e mensagem da OSV", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ code: 3, message: "Invalid query." }), {
            status: 400,
          }),
      ),
    );

    const result = await fetchVulnerabilities({
      name: "lodash",
      version: "4.17.11",
      ecosystem: "npm",
    });

    expect("isError" in result).toBe(true);
    if (!("isError" in result)) return;
    expect(result.message).toContain("HTTP 400");
    expect(result.message).toContain("Invalid query");
    expect(result.message.startsWith("Falha ao consultar OSV.dev")).toBe(true);
  });

  it("erro de rede: fetch rejeita e tool retorna erro de dominio em portugues", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );

    const result = await fetchVulnerabilities({
      name: "lodash",
      version: "4.17.11",
      ecosystem: "npm",
    });

    expect("isError" in result).toBe(true);
    if (!("isError" in result)) return;
    expect(result.message.startsWith("Falha ao consultar OSV.dev")).toBe(true);
    expect(result.message).toContain("ECONNREFUSED");
  });
});
