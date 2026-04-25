export const AI_STACK_DEPS: readonly string[] = [
  "openai",
  "@openai/agents",
  "@anthropic-ai/sdk",
  "langchain",
  "@langchain/core",
  "@langchain/community",
  "llamaindex",
  "ai",
  "groq-sdk",
  "cohere-ai",
  "@google/generative-ai",
  "@google/genai",
  "@aws-sdk/client-bedrock-runtime",
  "@mistralai/mistralai",
  "replicate",
  "together-ai",
];

export function hasAiStack(depNames: readonly string[]): boolean {
  const known = new Set<string>(AI_STACK_DEPS);
  for (const d of depNames) {
    if (known.has(d)) return true;
  }
  return false;
}
