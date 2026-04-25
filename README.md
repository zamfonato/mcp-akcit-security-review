# mcp-akcit-security-review

> **Servidor MCP que transforma o Claude Code em auditor de segurança de dependências Node.js, com classificação OWASP automática e análise contextual de exploitability.**

![status](https://img.shields.io/badge/status-MVP%20funcional-success)
![tests](https://img.shields.io/badge/tests-26%20passing-success)
![node](https://img.shields.io/badge/node-22%2B-blue)
![typescript](https://img.shields.io/badge/typescript-strict-blue)
![mcp](https://img.shields.io/badge/MCP-stdio-purple)
![license](https://img.shields.io/badge/license-MIT-green)

Trabalho prático do **Módulo 4** da Especialização em Engenharia de Software com IA Generativa — AKCIT / UFG, 2026.

---

## Sumário

- [O problema](#o-problema)
- [O que este servidor faz](#o-que-este-servidor-faz)
- [Demonstração com dados reais](#demonstração-com-dados-reais)
- [Decisões arquiteturais](#decisões-arquiteturais)
- [Por que MCP em vez de CLI tradicional?](#por-que-mcp-em-vez-de-cli-tradicional)
- [Por que slash command além das tools?](#por-que-slash-command-além-das-tools)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Uso](#uso)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Stack tecnológica](#stack-tecnológica)
- [Testes](#testes)
- [Como a IA acelerou este projeto](#como-a-ia-acelerou-este-projeto)
- [Promptware versionado](#promptware-versionado)
- [Custo operacional honesto](#custo-operacional-honesto)
- [Limitações conhecidas](#limitações-conhecidas)
- [Próximos passos](#próximos-passos)
- [Licença](#licença)
- [Referências](#referências)

---

## O problema

Auditar dependências Node.js em busca de vulnerabilidades não é problema novo. `npm audit`, Snyk e Dependabot resolvem o caso básico — listam CVEs, sugerem upgrades. **Mas três coisas continuam mal resolvidas:**

1. **Falta de contexto OWASP.** As listas vêm cruas, sem agrupamento por categoria. Um relatório diz "você tem 28 CVEs" — mas o gestor de segurança quer saber: *quantas categorias do OWASP Top 10 estão afetadas? Onde concentrar esforço?*

2. **Sem leitura de cadeia de transitividade.** Um CVE em `tar` raramente está lá porque você instalou `tar` — está porque seu `bcrypt` puxa `@mapbox/node-pre-gyp` que puxa `tar`. Atualizar o pai certo resolve várias vulnerabilidades de uma vez. Scanners genéricos não comunicam isso.

3. **"Mínimo seguro" ≠ "última versão".** A OSV diz que a `lodash@4.17.11` foi consertada em `4.17.21` — mas a última publicada hoje é `4.18.1`. E `4.17.21` que era considerada segura há um ano agora tem 3 CVEs novos. Ferramentas que listam só uma das duas informações deixam o engenheiro tomar decisão incompleta.

Este servidor MCP ataca os três pontos. Não substitui Snyk/Dependabot — adiciona uma camada de **raciocínio contextual sobre os dados crus**, executada pelo LLM cliente (Claude Code) com infraestrutura confiável fornecida por aqui.

---

## O que este servidor faz

Quando o usuário invoca `/mcp__akcit__audit` em qualquer projeto Node.js dentro do Claude Code, o servidor MCP orquestra um fluxo de auditoria completo:

1. **Lê o manifesto.** `package.json` (incluindo `peerDependencies`) e `package-lock.json` para resolver versões transitivas.
2. **Deduplica.** Constrói o conjunto único de pares `(name, version)` e nomes únicos para auditar.
3. **Consulta a OSV.dev.** Para cada par, busca CVEs conhecidos via tool MCP `fetch_vulnerabilities`.
4. **Consulta o registry npm.** Para cada nome único, busca a última versão e flag de deprecated via tool MCP `fetch_latest_version`.
5. **Classifica em OWASP Web Top 10 (2021).** Cada CVE encontrado é mapeado em uma das 10 categorias com base no CWE oficial; quando o CWE não casa, o LLM infere semanticamente e marca como `(inferred)`.
6. **Ativa lente OWASP LLM Top 10 (2025) condicionalmente.** Se o projeto tem dependências de SDK de IA (`openai`, `@anthropic-ai/sdk`, `langchain`, etc.), aplica também a categorização da Top 10 para aplicações LLM.
7. **Compara versões com semver.** Sinaliza major jumps (risco de breaking changes) ao recomendar upgrades.
8. **Identifica clusters de transitividade.** Reconhece quando vários problemas vêm da mesma cadeia e sugere correção upstream.
9. **Gera `SECURITY-REVIEW.md`** no diretório do projeto auditado, em português, estruturado e acionável.

---

## Demonstração com dados reais

Auditoria executada em projeto real (`datagov-api`, ~18 dependências diretas) em **25 de abril de 2026**.

| Métrica | Valor |
|---|---|
| Pacotes auditados | **224** (18 diretos, 206 transitivos) |
| Vulnerabilidades encontradas | **28** (0 CRITICAL, 14 HIGH, 11 MODERATE, 3 LOW) |
| Categorias OWASP Web afetadas | **5** (A01, A02, A03, A10, Outros) |
| Lente OWASP LLM | NÃO ATIVADA (projeto não usa SDKs de IA) |
| Pacotes deprecated detectados | **6** (1 direto, 5 transitivos) |
| Tempo de execução | **1m 56s** (auditoria) / 17m total (incluindo síntese do relatório) |
| Custo em LLM (Claude Opus 4.7) | **US$ 10,91** |

O relatório completo gerado está disponível em [`docs/example-output/SECURITY-REVIEW.md`](./docs/example-output/SECURITY-REVIEW.md).

### Exemplo de insight contextual gerado

> *"Atualizar `bcrypt` 5.1.1 → 6.0.0 elimina simultaneamente 5 transitivas deprecated **e** traz `tar` 7.x que fecha 6 CVEs HIGH de path traversal."*

Esse tipo de raciocínio — ligar **cluster de pacotes deprecated** com **cluster de CVEs em outras transitivas** que compartilham o mesmo ancestral — é o que diferencia uma auditoria com IA de uma listagem mecânica de CVEs.

---

## Decisões arquiteturais

Cada uma das três decisões abaixo foi tomada conscientemente, pesando alternativas. Estão documentadas porque o trade-off é interessante mais do que a resposta final.

### Decisão 1 — O servidor expõe **infraestrutura**, não inteligência

O servidor MCP **não chama LLMs internamente**. Ele expõe:

- **Tools** (`fetch_vulnerabilities`, `fetch_latest_version`) para fazer HTTP estruturado a APIs públicas (OSV.dev, npm registry) com schemas Zod e normalização de saída.
- **Prompt** (`audit`) que contém o template de orquestração + dados estáticos OWASP.

A inteligência — ler arquivos, raciocinar sobre dependências, sintetizar o relatório, classificar CWE → OWASP — fica no cliente Claude Code. **Servidor faz o que o LLM não faz bem (HTTP confiável, schema enforcement); LLM faz o que faz bem (síntese contextual).**

### Decisão 2 — Sem cache nem batch no MVP

A versão atual faz uma chamada HTTP individual à OSV.dev por par `(name, version)`. Para 224 pacotes isso significou ~224 round-trips. Foi consciente: a versão batch (`/v1/querybatch`) e cache em disco viraram itens do roadmap pós-MVP, depois que o **uso em projeto real revelar dor concreta de performance ou custo**.

A run real custou US$ 10,91 e levou 1m 56s — operacional, mas com espaço claro pra otimização. O dado empírico justifica o investimento futuro melhor do que especulação inicial teria.

### Decisão 3 — Curated mapping CWE → OWASP, não exaustivo

Cada uma das 10 categorias do OWASP Top 10 2021 inclui apenas os CWEs **que com certeza absoluta** pertencem àquela categoria pelo mapping oficial. Lista enxuta correta foi escolhida sobre lista grande chutada. CVEs cujo CWE não bate (ex: ReDoS — CWE-1333, DoS — CWE-400) caem na seção **"Outros / Sem categorização OWASP"** com a limitação declarada.

Essa escolha tem custo: ~12 dos 28 findings do uso real caíram em "Outros". Mas evita a alternativa pior: classificações erradas que parecem certas.

---

## Por que MCP em vez de CLI tradicional?

A alternativa óbvia seria um CLI: `npx mcp-akcit-security-review audit /path/to/repo`. Funcionaria. **Não foi a escolha por três motivos.**

### 1. Reutilização de capacidades nativas do Claude Code

Um CLI precisaria implementar do zero: ler `package.json`, parsear `package-lock.json`, sintetizar markdown, formatar tabelas, decidir tom do relatório. **O Claude Code já faz tudo isso nativamente, e melhor que código procedural conseguiria.** O servidor MCP delega cada uma dessas tarefas ao cliente, focando em apenas duas tools de I/O externo onde código vence LLM.

### 2. Composabilidade

Como MCP server, este projeto pode ser combinado com outros MCPs no mesmo cliente. Um auditor de segurança + um servidor de Jira = relatórios automaticamente abertos como issues. Um auditor + Slack MCP = postagem em canal. **Composição emergente sem código novo aqui.**

### 3. Ponto de partida claro com slash command

`/mcp__akcit__audit` é mais memorável que `npx ...` com flags. O usuário não precisa lembrar argumentos — o template injeta as instruções todas de uma vez.

---

## Por que slash command além das tools?

A arquitetura mais comum em MCP server é **só expor tools** e deixar o LLM cliente descobrir, em conversa natural, quando usar cada uma. *"Audite minhas dependências"* faria o Claude Code chamar `fetch_vulnerabilities` por iniciativa própria.

Funciona. **Mas tem três problemas concretos:**

1. **Conhecimento OWASP precisa ser injetado a cada conversa.** Sem o slash command, o usuário teria que dizer toda vez: *"audite e classifique por OWASP Web Top 10 e ative LLM Top 10 se houver AI stack..."* — repetição é fricção.

2. **Output instável.** Sem template, cada conversa produz um relatório com formato ligeiramente diferente. Difícil de parsear ou comparar entre runs.

3. **Demo fraca.** "Inicio uma conversa que provavelmente vai chamar as tools certas" é mais difícil de mostrar que "digito `/audit` e ele audita".

A escolha aqui foi expor **três primitivas MCP juntas:**

- **Tools** para I/O externo deterministico.
- **Prompt** (slash command) para encapsular o template + dados OWASP num gatilho de um clique.
- (Resources não são usados neste MVP — OWASP foi escolhido como dados estáticos no Prompt para simplificar.)

A documentação [Module 3 Unidade 2](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) chama o template do slash command de **"promptware"** — artefato versionado, testado, reaproveitável. Ele vive em `src/prompts/doc-security-review.ts`, tem testes unitários e participa da CI.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code (cliente)                     │
│                                                                  │
│   Lê arquivos │ Sintetiza markdown │ Classifica semanticamente   │
│   (Read tool)│ (LLM nativo)        │ (LLM com dados embutidos)   │
└──────┬──────────────────────────────────────────────────┬───────┘
       │ stdio (JSON-RPC)                                  │
       ▼                                                   ▼
┌──────────────────────────────┐         ┌─────────────────────────┐
│  MCP Tools                   │         │  MCP Prompt             │
│  ───────                     │         │  ──────────             │
│  fetch_vulnerabilities       │         │  audit                  │
│   └─→ OSV.dev /v1/query      │         │   └─→ template +        │
│                              │         │       OWASP Web Top 10  │
│  fetch_latest_version        │         │       OWASP LLM Top 10  │
│   └─→ registry.npmjs.org     │         │       AI_STACK_DEPS     │
└──────────────────────────────┘         └─────────────────────────┘
       │                                          │
       ▼                                          ▼
┌──────────────────────────────┐         ┌─────────────────────────┐
│  Normalização pura (Zod)     │         │  Data files estáticos   │
│  src/lib/osv-normalize.ts    │         │  src/data/*.ts          │
│  src/lib/npm-registry-       │         │                         │
│       normalize.ts           │         │  testáveis sem rede     │
└──────────────────────────────┘         └─────────────────────────┘
```

**Princípio de separação:** funções de I/O de rede e funções puras de normalização vivem em arquivos diferentes. As puras têm 100% dos testes unitários executando em milissegundos sem depender de conectividade.

---

## Pré-requisitos

- **Node.js 22+** (LTS) — para `fetch` global, suporte ESM completo
- **npm** (vem com Node)
- **Claude Code** instalado e configurado — [docs.anthropic.com/claude-code](https://docs.anthropic.com/en/docs/claude-code/overview)
- **Conexão à internet** durante a auditoria — consulta OSV.dev e registry npm

---

## Instalação

### 1. Clonar e construir

```bash
git clone https://github.com/zamfonato/mcp-akcit-security-review.git
cd mcp-akcit-security-review
npm install
npm run build
```

### 2. Registrar no Claude Code

Comando único, escopo de usuário (disponível em qualquer projeto):

```bash
claude mcp add akcit -s user -- node "$(pwd)/dist/index.js"
```

Em Windows com bash:

```bash
claude mcp add akcit -s user -- node "C:/Users/$(whoami)/.../mcp-akcit-security-review/dist/index.js"
```

### 3. Verificar conexão

```bash
claude mcp list
```

Saída esperada:

```
akcit: node /path/to/dist/index.js - ✓ Connected
```

### 4. Reiniciar o Claude Code

Sai e abre o Claude Code de novo para ele recarregar a lista de servidores MCP.

---

## Uso

### Caso comum: auditar o projeto atual

Em qualquer terminal onde o `cwd` aponta pra um projeto Node.js, abra o Claude Code e digite:

```
/mcp__akcit__audit .
```

(O `.` é o argumento `repo_path` apontando pro diretório atual. Pode ser qualquer path absoluto.)

O Claude Code vai:

1. Ler o `package.json` e `package-lock.json` do diretório indicado.
2. Chamar `fetch_vulnerabilities` paralelamente para cada dependência única.
3. Chamar `fetch_latest_version` para cada nome único.
4. Sintetizar o relatório em `SECURITY-REVIEW.md` no mesmo diretório.

### Tools individuais (uso avançado)

As tools também podem ser invocadas isoladamente em conversas comuns:

> *"Use a tool fetch_vulnerabilities pra ver se lodash@4.17.11 tem CVEs."*

> *"Use a tool fetch_latest_version pra saber a última versão do express."*

---

## Estrutura do repositório

```
mcp-akcit-security-review/
├── src/
│   ├── index.ts                      Entrypoint MCP — registra tools e prompt
│   ├── data/
│   │   ├── owasp-web.ts              OWASP Top 10 2021 + mapping CWE
│   │   ├── owasp-llm.ts              OWASP LLM Top 10 2025
│   │   └── ai-stack-deps.ts          Lista de SDKs de IA + função hasAiStack
│   ├── lib/
│   │   ├── osv-normalize.ts          Normalização pura da resposta OSV
│   │   └── npm-registry-normalize.ts Normalização pura do manifest npm
│   ├── prompts/
│   │   └── doc-security-review.ts    Template do slash command audit
│   └── tools/
│       ├── fetch-vulnerabilities.ts  Tool MCP — consulta OSV.dev
│       └── fetch-latest-version.ts   Tool MCP — consulta registry npm
├── tests/
│   ├── data/                         Testes dos data files (8 testes)
│   ├── lib/                          Testes das normalizations puras (6 testes)
│   ├── prompts/                      Testes do template do slash command (4 testes)
│   ├── tools/                        Testes das tools com mock de fetch (8 testes)
│   └── fixtures/                     Respostas reais capturadas das APIs
│       ├── osv/                      Fixtures OSV.dev
│       └── npm/                      Fixtures registry npm
├── prompts/                          Promptware versionado (ver seção dedicada)
│   ├── 1. prompt-inicial.md
│   ├── 2. primeira-tool.md
│   └── 3. slash-command-e-owasp.md
├── docs/
│   └── example-output/
│       └── SECURITY-REVIEW.md        Saída real de uso em projeto real
├── package.json
├── tsconfig.json
└── README.md
```

---

## Stack tecnológica

| Camada | Tecnologia | Motivação |
|---|---|---|
| Runtime | Node.js 22 LTS | `fetch` global nativo, ESM completo, suporte longo |
| Linguagem | TypeScript estrito (`strict: true`, `noUncheckedIndexedAccess: true`) | Garantias em tempo de compilação para um MCP que processa schemas externos |
| MCP SDK | `@modelcontextprotocol/sdk` v1.29 | Implementação oficial Anthropic, transporte stdio |
| Validação | Zod v3.25 | Schema-first, conversão para JSON Schema manual no inputSchema |
| Testes | Vitest v2.1 | Compatível com ESM, suporta fake timers e mock de globals |
| Distribuição | npm scoped (`@zamfonato/...`) | Namespace evita colisão |

### Modelos de IA empregados

- **Claude Code (cliente MCP)** — usado durante o desenvolvimento e como cliente em runtime.
- **Claude Opus 4.7** — modelo padrão observado durante a validação em projeto real (~US$ 11 por run de 224 deps).
- **Claude Sonnet 4.6** — modelo recomendado para menor custo (~3-5x mais barato que Opus).

---

## Testes

```bash
npm test
```

Saída esperada:

```
 ✓ tests/data/ai-stack-deps.test.ts          (3 tests)
 ✓ tests/data/owasp-llm.test.ts              (2 tests)
 ✓ tests/data/owasp-web.test.ts              (3 tests)
 ✓ tests/lib/npm-registry-normalize.test.ts  (3 tests)
 ✓ tests/lib/osv-normalize.test.ts           (3 tests)
 ✓ tests/prompts/doc-security-review.test.ts (4 tests)
 ✓ tests/tools/fetch-latest-version.test.ts  (4 tests)
 ✓ tests/tools/fetch-vulnerabilities.test.ts (4 tests)

 Test Files  8 passed (8)
      Tests  26 passed (26)
   Duration  ~450ms
```

**Todos os testes rodam sem rede.** As tools usam `vi.stubGlobal("fetch", ...)` com fake timers e fixtures reais capturadas das APIs durante o desenvolvimento. As normalizações puras testam diretamente sem mock.

Para checagem de tipos sem emitir build:

```bash
npx tsc --noEmit
```
---

## Promptware versionado

A pasta `prompts/` contém os três prompts que materializaram este projeto, em ordem cronológica:

| # | Arquivo | Resultado |
|---|---|---|
| 1 | [`1. prompt-inicial.md`](./prompts/1.%20prompt-inicial.md) | Scaffold inicial: estrutura, `package.json`, `tsconfig`, servidor MCP vazio |
| 2 | [`2. primeira-tool.md`](./prompts/2.%20primeira-tool.md) | Tool `fetch_vulnerabilities` (OSV.dev) com normalização separada e 7 testes |
| 3 | [`3. slash-command-e-owasp.md`](./prompts/3.%20slash-command-e-owasp.md) | Tool `fetch_latest_version`, data files OWASP, slash command `audit`, 19 novos testes |

Cada prompt segue a mesma estrutura:

- **Header** com data, fase do SDLC, modelo-alvo, técnicas aplicadas.
- **Intenção** explicando o salto desde o prompt anterior.
- **Dados empíricos** (quando aplicável) com testes da API real.
- **Prompt em si** estruturado em tags XML (`<role>`, `<context>`, `<task>`, `<reasoning_strategy>`, `<examples>`, `<constraints>`, `<anti_hallucination_checklist>`, `<output_format>`, `<acceptance_criteria>`, `<open_questions>`).
- **Mapeamento de técnicas → conteúdo do curso** (tabela com referências ao Módulo).
- **Decisões conscientes de não-aplicação** (técnicas conhecidas e descartadas com justificativa).
- **Notas pós-execução** (preenchidas após executar o prompt no Claude Code).

A intenção de versionar isso publicamente é dupla:

1. **Reprodutibilidade:** quem quiser construir um servidor MCP semelhante tem três prompts didáticos.
2. **Honestidade do processo:** mostra **as iterações com pivots e correções**, não a história limpa que o resultado sugere.

---

## Custo operacional honesto

Validação em projeto real (Node.js, ~18 deps diretas, 224 transitivas):

| Componente | Valor |
|---|---|
| Modelo usado | Claude Opus 4.7 |
| Tempo de API | 10m 10s |
| Tempo de relógio (incluindo síntese de texto) | 17m 13s |
| Tokens output | 66.300 |
| Tokens cache write | 1.400.000 |
| Tokens cache read | 847.400 |
| Tokens input puro | 34 |
| **Custo total** | **US$ 10,91** |

### Por que tão alto?

A maior parte foi **cache write** (1,4 milhões de tokens). Isso aconteceu porque cada uma das ~224 chamadas a `fetch_vulnerabilities` reinjeta o contexto da conversa no cache para a próxima chamada poder continuar o raciocínio. Sem batch ou cache local, esse padrão se acumula proporcionalmente ao número de dependências.

### Como reduzir

| Otimização | Redução estimada |
|---|---|
| Trocar Opus 4.7 por Sonnet 4.6 | 3-5x mais barato (~US$ 2-3 por run) |
| Implementar batch endpoint OSV (`/v1/querybatch`) | Reduz cache write proporcionalmente — estimativa US$ 3-4 |
| Implementar cache em disco (re-runs) | Re-runs ficam quase grátis (só síntese final) |
| Combinação Sonnet + batch + cache | Estimativa < US$ 1 por run |

---

## Limitações conhecidas

- **Apenas npm.** Cargo, PyPI, Maven, NuGet ficam fora deste MVP. Adição é aditiva (mais ecossistemas no Zod literal de input).
- **Não substitui SAST/SCA contínuo.** Esta é auditoria pontual. Snyk, Dependabot, Trivy continuam relevantes para CI/CD contínuo.
- **Sem análise de uso real.** Não verifica se a função vulnerável da biblioteca é de fato chamada no código da aplicação. Algumas vulnerabilidades listadas podem não ser exploráveis em prática.
- **Mapping CWE → OWASP é conservador.** ~12 dos 28 findings do uso real caíram na seção "Outros / Sem categorização OWASP" porque seu CWE não está nas listas conservadoras de cada categoria. Mapping mais expansivo está no roadmap.
- **Sem cache, sem batch.** Cada par `(name, version)` é uma chamada HTTP individual. Para projetos com 500+ deps, o custo escala linearmente.
- **Argumento `repo_path` causa fricção de UX.** O Claude Code abre um campo de input para o argumento opcional. Workaround: passar `.` ou um path absoluto explicitamente.
- **Custo por run não é trivial.** US$ 10,91 numa run com Opus 4.7 e 224 deps. Sonnet reduz para faixa de US$ 2-3.
- **OSV.dev pode ter gaps.** Pacotes obscuros podem não estar indexados. A auditoria reflete o que a OSV conhece em uma data específica.
- **Apenas read-only no projeto auditado.** Não aplica fix automático nem abre PR. Geração do `SECURITY-REVIEW.md` é o entregável.

---

## Licença

[MIT](./LICENSE) © 2026 Pedro Santos

Implica especificamente que o uso é livre para fins acadêmicos, comerciais e pessoais; sem garantia.

---

## Referências

### Materiais do curso

- AKCIT / Embrapii / UFG (2026). *Especialização em Engenharia de Software com IA Generativa* — Módulos 1 a 4.

### Padrões e especificações

- [Model Context Protocol — Anthropic (2025)](https://modelcontextprotocol.io)
- [OWASP Top 10 — 2021 Web Application Security Risks](https://owasp.org/Top10/)
- [OWASP Top 10 for Large Language Model Applications — 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST AI 600-1 — Generative AI Profile (2024)](https://airc.nist.gov/AI_RMF_Knowledge_Base/AI_RMF/Profiles/Generative_AI)

### Bases de dados consultadas em runtime

- [OSV.dev API](https://google.github.io/osv.dev/api/) — base pública de vulnerabilidades open source.
- [npm registry API](https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md) — manifest de pacotes.

### Ferramentas semelhantes (não substituídas por este projeto)

- [`npm audit`](https://docs.npmjs.com/cli/v10/commands/npm-audit) — built-in scanner do npm.
- [Snyk](https://snyk.io/) — SCA com CI/CD integration e auto-fix.
- [Dependabot (GitHub)](https://docs.github.com/en/code-security/dependabot) — PR automático de upgrades.
- [Trivy (Aqua Security)](https://aquasecurity.github.io/trivy/) — scanner multi-ecosystem com SBOM.