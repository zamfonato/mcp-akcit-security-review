import { describe, expect, it } from "vitest";
import {
  OWASP_WEB_TOP_10,
  findWebCategoryByCwe,
} from "../../src/data/owasp-web.js";

describe("OWASP_WEB_TOP_10", () => {
  it("contem exatamente 10 entradas com IDs unicos A01..A10", () => {
    expect(OWASP_WEB_TOP_10).toHaveLength(10);
    const ids = OWASP_WEB_TOP_10.map((c) => c.id);
    expect(ids).toEqual(["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10"]);
    expect(new Set(ids).size).toBe(10);
  });

  it("toda categoria tem top_cwe_ids nao-vazio", () => {
    for (const cat of OWASP_WEB_TOP_10) {
      expect(cat.top_cwe_ids.length).toBeGreaterThan(0);
    }
  });
});

describe("findWebCategoryByCwe", () => {
  it("CWE-89 (SQL injection) resolve para A03 Injection", () => {
    const found = findWebCategoryByCwe("CWE-89");
    expect(found).not.toBeNull();
    expect(found?.id).toBe("A03");
    expect(found?.title).toBe("Injection");
  });
});
