export interface OwaspLlmCategory {
  readonly id: string;
  readonly title: string;
  readonly short_description: string;
}

export const OWASP_LLM_TOP_10_2025: readonly OwaspLlmCategory[] = [
  {
    id: "LLM01",
    title: "Prompt Injection",
    short_description:
      "Entrada manipulada altera o comportamento do LLM, ignorando instrucoes do sistema ou induzindo acoes nao autorizadas (direta ou indireta via conteudo recuperado).",
  },
  {
    id: "LLM02",
    title: "Sensitive Information Disclosure",
    short_description:
      "LLM expoe dados sensiveis presentes em treinamento, contexto ou retrieval: PII, segredos, propriedade intelectual.",
  },
  {
    id: "LLM03",
    title: "Supply Chain",
    short_description:
      "Modelos, plugins, datasets e pacotes de terceiros comprometidos introduzem riscos no pipeline de LLM.",
  },
  {
    id: "LLM04",
    title: "Data and Model Poisoning",
    short_description:
      "Treinamento ou fine-tuning com dados envenenados altera comportamento, abre backdoors ou degrada qualidade do modelo.",
  },
  {
    id: "LLM05",
    title: "Improper Output Handling",
    short_description:
      "Saida do LLM e consumida por sistemas downstream sem sanitizacao, permitindo XSS, SSRF, RCE, SQLi a partir do texto gerado.",
  },
  {
    id: "LLM06",
    title: "Excessive Agency",
    short_description:
      "Agente LLM tem permissoes, ferramentas ou autonomia alem do necessario, ampliando o impacto de prompt injection e de erros do modelo.",
  },
  {
    id: "LLM07",
    title: "System Prompt Leakage",
    short_description:
      "System prompt com instrucoes confidenciais ou guardrails e extraido via inspecao comportamental, jailbreak ou injection direta.",
  },
  {
    id: "LLM08",
    title: "Vector and Embedding Weaknesses",
    short_description:
      "Falhas em embedding stores e RAG: cross-tenant leakage, poisoning de chunks recuperados, embedding inversion.",
  },
  {
    id: "LLM09",
    title: "Misinformation",
    short_description:
      "LLM produz output factualmente incorreto com aparencia confiavel, levando a decisoes erradas. Sucessor da categoria 'Overreliance' (2023).",
  },
  {
    id: "LLM10",
    title: "Unbounded Consumption",
    short_description:
      "Custo excessivo de tokens, denial-of-wallet, model theft via consultas massivas. Sucessor de 'Model Denial of Service' (2023).",
  },
];
