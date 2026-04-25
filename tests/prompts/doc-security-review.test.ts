import { describe, expect, it } from "vitest";
import { renderDocSecurityReviewPrompt } from "../../src/prompts/doc-security-review.js";
import { OWASP_WEB_TOP_10 } from "../../src/data/owasp-web.js";
import { OWASP_LLM_TOP_10_2025 } from "../../src/data/owasp-llm.js";

function getText(args: { repo_path?: string }): string {
  const result = renderDocSecurityReviewPrompt(args);
  return result.messages[0]?.content.text ?? "";
}

describe("renderDocSecurityReviewPrompt", () => {
  it("template embute o titulo de cada categoria OWASP Web Top 10 (10 asserts)", () => {
    const text = getText({});
    for (const cat of OWASP_WEB_TOP_10) {
      expect(text).toContain(cat.title);
    }
  });

  it("template embute o titulo de cada categoria OWASP LLM Top 10 2025 (10 asserts)", () => {
    const text = getText({});
    for (const cat of OWASP_LLM_TOP_10_2025) {
      expect(text).toContain(cat.title);
    }
  });

  it("template menciona explicitamente package.json, package-lock.json e peerDependencies", () => {
    const text = getText({});
    expect(text).toContain("package.json");
    expect(text).toContain("package-lock.json");
    expect(text).toContain("peerDependencies");
  });

  it("inclui repo_path literal quando passado; instrui usar diretorio atual quando ausente", () => {
    const withPath = getText({ repo_path: "/tmp/projeto-x" });
    expect(withPath).toContain("/tmp/projeto-x");

    const withoutPath = getText({});
    expect(withoutPath).toContain("diretório atual");
  });
});
