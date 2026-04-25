import { describe, expect, it } from "vitest";
import { AI_STACK_DEPS, hasAiStack } from "../../src/data/ai-stack-deps.js";

describe("AI_STACK_DEPS", () => {
  it("lista nao-vazia de pacotes conhecidos", () => {
    expect(AI_STACK_DEPS.length).toBeGreaterThan(0);
    expect(AI_STACK_DEPS).toContain("openai");
    expect(AI_STACK_DEPS).toContain("@anthropic-ai/sdk");
  });
});

describe("hasAiStack", () => {
  it("retorna false quando deps nao interceptam o catalogo", () => {
    expect(hasAiStack(["express", "lodash", "react"])).toBe(false);
  });

  it("retorna true quando ao menos um pacote do catalogo aparece nas deps", () => {
    expect(hasAiStack(["express", "openai"])).toBe(true);
  });
});
