import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";
import { OWASP_WEB_TOP_10 } from "../data/owasp-web.js";
import { OWASP_LLM_TOP_10_2025 } from "../data/owasp-llm.js";
import { AI_STACK_DEPS } from "../data/ai-stack-deps.js";

export const DOC_SECURITY_REVIEW_PROMPT = "audit";

export interface DocSecurityReviewArgs {
  repo_path?: string;
}

export type PromptResult = GetPromptResult;

function renderWebTable(): string {
  const header =
    "| ID | Titulo | Descricao | CWE-IDs principais |\n|----|--------|-----------|---------------------|";
  const rows = OWASP_WEB_TOP_10.map(
    (c) =>
      `| ${c.id} | ${c.title} | ${c.short_description} | ${c.top_cwe_ids.join(", ")} |`,
  );
  return [header, ...rows].join("\n");
}

function renderLlmTable(): string {
  const header = "| ID | Titulo | Descricao |\n|-------|--------|-----------|";
  const rows = OWASP_LLM_TOP_10_2025.map(
    (c) => `| ${c.id} | ${c.title} | ${c.short_description} |`,
  );
  return [header, ...rows].join("\n");
}

function renderAiStackList(): string {
  return AI_STACK_DEPS.map((d) => `- \`${d}\``).join("\n");
}

function renderReportSkeleton(): string {
  return `# Security Review - <NOME-DO-PROJETO>

**Gerado em:** <ISO 8601>
**Auditor:** mcp-akcit-security-review v0.1.0
**Escopo:** dependencies + devDependencies + peerDependencies (diretas e transitivas via package-lock.json)

## Resumo Executivo
- <N> pacotes auditados (<N_diretos> diretos, <N_trans> transitivos)
- <N> vulnerabilidades encontradas (<N_critical> CRITICAL, <N_high> HIGH, <N_moderate> MODERATE, <N_low> LOW)
- <N> categorias OWASP Web Top 10 afetadas
- Lente OWASP LLM Top 10: <ATIVADA por presenca de openai/anthropic-ai|NAO ATIVADA - projeto nao usa AI APIs detectadas>
- <N> pacotes deprecated em uso

## OWASP Web Top 10 - Findings agrupados

### A06 - Vulnerable and Outdated Components (<N> findings)
#### lodash @ 4.17.11 - <N> CVEs
- **GHSA-XXXX-XXXX-XXXX** (CVE-YYYY-NNNN, MODERATE)
  - <descricao curta da vuln> - CWE-NNN
  - Versao minima segura (OSV): <fixed_in>
  - Ultima disponivel (npm): <latest_version>
  - Recomendacao: upgrade para <X> (<mesmo major | major jump - risco de breaking changes>)

### A03 - Injection (<N> findings)
...

## OWASP LLM Top 10 (2025) - apenas se ativada
### LLM03 - Supply Chain
...

## Pacotes Deprecated
- request@2.88.2 - "request has been deprecated, ..."
  - Migrar para axios, undici ou fetch nativo

## Outros / Sem categorizacao OWASP
...

## Apendice - Limitacoes
- Auditoria baseada exclusivamente em CVEs publicos da OSV.dev
- Nao substitui Snyk/Dependabot/SAST
- LLM Top 10 mapeado por similaridade semantica (nao ha CWE oficial)`;
}

export function renderDocSecurityReviewPrompt(
  args: DocSecurityReviewArgs,
): PromptResult {
  const repoPath = args.repo_path;
  const repoInstruction =
    repoPath !== undefined && repoPath.length > 0
      ? `O repositorio a auditar esta em \`${repoPath}\`. Resolva todos os caminhos relativos a partir dele.`
      : "O repositorio a auditar e o diretório atual de trabalho do cliente. Resolva caminhos relativos a partir dele.";

  const text = `Voce e um auditor de seguranca de software experiente, especializado em dependencias Node.js e mapeamento OWASP. Sua tarefa e gerar um arquivo \`SECURITY-REVIEW.md\` no diretorio raiz do repositorio auditado.

## Escopo do repositorio
${repoInstruction}

## Plano operacional (passo a passo)

1. **Ler manifesto:** abra \`package.json\`. Colete os pares \`{name, version}\` de \`dependencies\`, \`devDependencies\` e \`peerDependencies\`. Marque cada um pela origem.
2. **Resolver transitivas:** se \`package-lock.json\` existir, leia-o e extraia o conjunto completo de pares \`{name, version}\` resolvidos (incluindo transitivas). Caso contrario, audite apenas as diretas e marque essa limitacao explicitamente no relatorio.
3. **Deduplicar:** monte \`unique_pairs\` (conjunto unico de \`{name, version}\`) e \`unique_names\` (conjunto unico de \`name\`).
4. **Auditar vulnerabilidades:** para cada par em \`unique_pairs\`, chame a tool \`fetch_vulnerabilities\` com \`{name, version, ecosystem: "npm"}\`. Acumule os CVEs encontrados.
5. **Comparar versoes:** para cada nome em \`unique_names\`, chame a tool \`fetch_latest_version\` com \`{name, ecosystem: "npm"}\`. Compare a versao instalada com \`fixed_in\` (minima segura, vinda da OSV) e com \`latest_version\` (ultima publicada no npm). Identifique major jumps (incremento do primeiro numero de versao no semver) e sinalize risco de breaking changes.
6. **Sinalizar deprecated:** todo pacote cujo \`is_deprecated === true\` no resultado de \`fetch_latest_version\` vai para a secao "Pacotes Deprecated" com a mensagem original e sugestao de substituto se for obvia.
7. **Classificar OWASP Web:** para cada CVE, use o(s) \`cwe_ids\` retornado(s) e localize a categoria OWASP Web 2021 cujo \`top_cwe_ids\` contem aquele CWE. Se nenhuma categoria contem, infira pela natureza da vulnerabilidade e marque com \`(inferred)\`. Se a vuln nao tem CWE conhecido, agrupe em "Outros / Sem categorizacao OWASP".
8. **Ativar lente LLM:** se \`unique_names\` interceptar a lista \`AI_STACK_DEPS\` abaixo, inclua a secao "OWASP LLM Top 10 (2025)" e correlacione semanticamente cada finding com a categoria LLM mais aplicavel. Caso contrario, declare explicitamente que a lente NAO foi ativada.
9. **Gerar relatorio:** escreva o arquivo \`SECURITY-REVIEW.md\` no diretorio raiz do repositorio auditado, seguindo o esqueleto da secao "Formato do relatorio" abaixo. Preencha contagens dinamicamente.

## OWASP Web Top 10 (2021) - referencia embutida

${renderWebTable()}

## OWASP LLM Top 10 (2025) - referencia embutida (ativada apenas se houver AI stack)

${renderLlmTable()}

## AI_STACK_DEPS - pacotes que ativam a lente LLM

${renderAiStackList()}

## Formato do relatorio (\`SECURITY-REVIEW.md\`)

\`\`\`markdown
${renderReportSkeleton()}
\`\`\`

## Diretrizes anti-alucinacao

- **Nao invente CVEs.** Toda vulnerabilidade citada deve vir do retorno de \`fetch_vulnerabilities\`.
- **Nao invente versoes.** Versao minima segura vem de \`fixed_in\`; ultima versao vem de \`latest_version\`.
- **CWE nao mapeada:** se um CWE nao casa com nenhum \`top_cwe_ids\`, classifique pela inferencia semantica e marque \`(inferred)\` ao lado do nome da categoria.
- **Sem CWE:** vulns sem CWE entram em "Outros / Sem categorizacao OWASP".
- **Lente LLM:** so ative se houver pelo menos um pacote da lista \`AI_STACK_DEPS\`. Caso contrario, declare "NAO ATIVADA".
- **Linguagem:** o relatorio final e em PT-BR. IDs e titulos OWASP permanecem em ingles (padrao internacional).

Inicie o trabalho agora. Reporte de volta um resumo do que escreveu ao final.`;

  return {
    description:
      "Audita dependencias Node.js do repositorio (diretas, dev, peer e transitivas via lockfile), classifica CVEs em categorias OWASP Web Top 10, ativa lente OWASP LLM Top 10 quando houver AI stack, e produz SECURITY-REVIEW.md.",
    messages: [
      {
        role: "user",
        content: { type: "text", text },
      },
    ],
  };
}
