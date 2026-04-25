export interface OwaspWebCategory {
  readonly id: string;
  readonly title: string;
  readonly short_description: string;
  readonly top_cwe_ids: readonly string[];
}

export const OWASP_WEB_TOP_10: readonly OwaspWebCategory[] = [
  {
    id: "A01",
    title: "Broken Access Control",
    short_description:
      "Falhas de autorizacao permitem que usuarios acessem recursos ou executem acoes alem de seu nivel de permissao. Inclui IDOR, escalada de privilegio e bypass de controles de acesso.",
    top_cwe_ids: [
      "CWE-22",
      "CWE-200",
      "CWE-284",
      "CWE-285",
      "CWE-352",
      "CWE-639",
      "CWE-862",
      "CWE-863",
    ],
  },
  {
    id: "A02",
    title: "Cryptographic Failures",
    short_description:
      "Protecao inadequada de dados sensiveis em transito e em repouso: algoritmos fracos, chaves estaticas, ausencia de TLS, armazenamento em texto claro.",
    top_cwe_ids: [
      "CWE-259",
      "CWE-319",
      "CWE-326",
      "CWE-327",
      "CWE-328",
      "CWE-330",
      "CWE-916",
    ],
  },
  {
    id: "A03",
    title: "Injection",
    short_description:
      "Entrada nao confiavel e interpretada como codigo ou comando pelo backend: SQL injection, command injection, XSS, code injection e variantes.",
    top_cwe_ids: [
      "CWE-20",
      "CWE-74",
      "CWE-77",
      "CWE-78",
      "CWE-79",
      "CWE-89",
      "CWE-90",
      "CWE-94",
      "CWE-917",
    ],
  },
  {
    id: "A04",
    title: "Insecure Design",
    short_description:
      "Falhas estruturais no projeto do sistema que nenhuma implementacao correta de controle individual resolve: ausencia de threat modeling, fluxos de negocio sem resistencia a abuso.",
    top_cwe_ids: ["CWE-209", "CWE-256", "CWE-501", "CWE-522"],
  },
  {
    id: "A05",
    title: "Security Misconfiguration",
    short_description:
      "Configuracoes default inseguras, servicos expostos desnecessariamente, mensagens de erro reveladoras, processadores XML com XXE habilitado.",
    top_cwe_ids: ["CWE-16", "CWE-260", "CWE-315", "CWE-611", "CWE-614", "CWE-756"],
  },
  {
    id: "A06",
    title: "Vulnerable and Outdated Components",
    short_description:
      "Uso de bibliotecas com CVEs publicos, em fim de vida ou desatualizadas. Categoria mais relevante para auditorias de dependencias npm.",
    top_cwe_ids: ["CWE-937", "CWE-1104"],
  },
  {
    id: "A07",
    title: "Identification and Authentication Failures",
    short_description:
      "Mecanismos de autenticacao fracos: senhas previsiveis, sessoes mal gerenciadas, ausencia de MFA, brute-force nao mitigado, credenciais hard-coded.",
    top_cwe_ids: [
      "CWE-287",
      "CWE-294",
      "CWE-306",
      "CWE-307",
      "CWE-384",
      "CWE-521",
      "CWE-798",
    ],
  },
  {
    id: "A08",
    title: "Software and Data Integrity Failures",
    short_description:
      "Atualizacoes, plugins e dados desserializados sem verificacao de integridade. Inclui supply chain attacks e desserializacao insegura.",
    top_cwe_ids: ["CWE-345", "CWE-426", "CWE-494", "CWE-502", "CWE-829"],
  },
  {
    id: "A09",
    title: "Security Logging and Monitoring Failures",
    short_description:
      "Eventos de seguranca nao logados, logs sem retencao adequada, ausencia de alertas: atrasa deteccao e resposta a incidentes.",
    top_cwe_ids: ["CWE-117", "CWE-223", "CWE-532", "CWE-778"],
  },
  {
    id: "A10",
    title: "Server-Side Request Forgery (SSRF)",
    short_description:
      "Aplicacao faz requisicoes controladas pelo atacante para enderecos internos nao previstos, expondo metadados de cloud e servicos nao autenticados na rede interna.",
    top_cwe_ids: ["CWE-918"],
  },
];

export function findWebCategoryByCwe(cwe: string): OwaspWebCategory | null {
  return OWASP_WEB_TOP_10.find((c) => c.top_cwe_ids.includes(cwe)) ?? null;
}
