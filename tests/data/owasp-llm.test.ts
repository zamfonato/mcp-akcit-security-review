import { describe, expect, it } from "vitest";
import { OWASP_LLM_TOP_10_2025 } from "../../src/data/owasp-llm.js";

describe("OWASP_LLM_TOP_10_2025", () => {
  it("contem 10 entradas com IDs unicos LLM01..LLM10", () => {
    expect(OWASP_LLM_TOP_10_2025).toHaveLength(10);
    const ids = OWASP_LLM_TOP_10_2025.map((c) => c.id);
    expect(ids).toEqual([
      "LLM01",
      "LLM02",
      "LLM03",
      "LLM04",
      "LLM05",
      "LLM06",
      "LLM07",
      "LLM08",
      "LLM09",
      "LLM10",
    ]);
    expect(new Set(ids).size).toBe(10);
  });

  it("toda categoria tem title e short_description nao-vazios", () => {
    for (const cat of OWASP_LLM_TOP_10_2025) {
      expect(cat.title.length).toBeGreaterThan(0);
      expect(cat.short_description.length).toBeGreaterThan(0);
    }
  });
});
