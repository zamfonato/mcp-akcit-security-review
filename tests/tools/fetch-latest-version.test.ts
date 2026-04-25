import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLatestVersion } from "../../src/tools/fetch-latest-version.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "../fixtures/npm");

const FROZEN_NOW = new Date("2026-04-25T17:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FROZEN_NOW);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("fetchLatestVersion", () => {
  it("happy path lodash: parseia fixture, normaliza e injeta queried_at deterministico", async () => {
    const fixture = await readFile(resolve(FIXTURES, "lodash-latest.json"), "utf-8");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(fixture, { status: 200 })),
    );
    const result = await fetchLatestVersion({ name: "lodash", ecosystem: "npm" });
    expect("isError" in result).toBe(false);
    if ("isError" in result) return;
    expect(result.queried_at).toBe(FROZEN_NOW.toISOString());
    expect(result.latest_version).toBe("4.18.1");
    expect(result.is_deprecated).toBe(false);
    expect(result.license).toBe("MIT");
    expect(result.repository_url).toBe("https://github.com/lodash/lodash.git");
  });

  it("pacote deprecated: is_deprecated true e mensagem preservada", async () => {
    const fixture = await readFile(resolve(FIXTURES, "deprecated-package.json"), "utf-8");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(fixture, { status: 200 })),
    );
    const result = await fetchLatestVersion({ name: "request", ecosystem: "npm" });
    expect("isError" in result).toBe(false);
    if ("isError" in result) return;
    expect(result.is_deprecated).toBe(true);
    expect(result.deprecation_message).toContain("request has been deprecated");
  });

  it("HTTP 404: retorna erro de dominio mencionando 'nao encontrado no registry npm'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Not Found", { status: 404 })),
    );
    const result = await fetchLatestVersion({
      name: "este-pacote-nao-existe-12345",
      ecosystem: "npm",
    });
    expect("isError" in result).toBe(true);
    if (!("isError" in result)) return;
    expect(result.message).toContain("este-pacote-nao-existe-12345");
    expect(result.message).toContain("nao encontrado no registry npm");
    expect(result.message).toContain("HTTP 404");
  });

  it("erro de rede: fetch rejeita e tool retorna 'Falha ao consultar registry npm'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const result = await fetchLatestVersion({ name: "lodash", ecosystem: "npm" });
    expect("isError" in result).toBe(true);
    if (!("isError" in result)) return;
    expect(result.message.startsWith("Falha ao consultar registry npm")).toBe(true);
    expect(result.message).toContain("ECONNREFUSED");
  });
});
