# Security Review - datagov-api

**Gerado em:** 2026-04-25T12:33:00Z
**Auditor:** mcp-akcit-security-review v0.1.0
**Escopo:** dependencies + devDependencies + peerDependencies (diretas e transitivas via package-lock.json)

## Resumo Executivo

- 224 pacotes auditados (18 diretos, 206 transitivos)
- 28 vulnerabilidades encontradas (0 CRITICAL, 14 HIGH, 11 MODERATE, 3 LOW)
- 5 categorias OWASP Web Top 10 afetadas (A01, A02, A03, A10, Outros)
- Lente OWASP LLM Top 10: **NAO ATIVADA** - projeto nao usa AI APIs detectadas (nenhum pacote da lista AI_STACK_DEPS encontrado)
- 6 pacotes deprecated em uso (1 dependencia direta, 5 transitivas)

### Pacotes diretos vulneraveis (prioridade de correcao)

| Pacote | Versao instalada | Versao minima segura | Ultima versao | Severidade max |
|--------|------------------|----------------------|---------------|----------------|
| axios | 1.13.2 | 1.15.0 | 1.15.2 | HIGH |
| express-rate-limit | 8.0.1 | 8.2.2 | 8.4.1 | HIGH |
| nodemailer | 6.9.16 | 8.0.5 | 8.0.6 | HIGH |
| crypto (deprecated) | 1.0.1 | n/a | 1.0.1 | n/a (remover) |

### Pacotes transitivos vulneraveis criticos

| Pacote | Versao | Caminho provavel | Severidade max |
|--------|--------|------------------|----------------|
| tar | 6.2.1 | bcrypt -> @mapbox/node-pre-gyp -> tar | HIGH (6 CVEs) |
| minimatch | 3.1.2 | bcrypt/glob | HIGH (3 CVEs) |
| path-to-regexp | 0.1.10 | express -> path-to-regexp | HIGH (2 CVEs) |
| jws | 3.2.2 | jsonwebtoken -> jws | HIGH |
| lodash | 4.17.21 | jsonwebtoken / bull | HIGH (3 CVEs) |
| brace-expansion | 1.1.11 | minimatch | MODERATE |
| follow-redirects | 1.15.11 | axios -> follow-redirects | MODERATE |
| qs | 6.13.0 | express -> qs | MODERATE |
| uuid | 8.3.2 | bull -> uuid | MODERATE |

---

## OWASP Web Top 10 - Findings agrupados

### A01 - Broken Access Control (6 findings)

#### tar @ 6.2.1 - 5 CVEs (path traversal)
- **GHSA-34x7-hfp2-rc4v** (CVE-2026-24842, HIGH)
  - node-tar Vulnerable to Arbitrary File Creation/Overwrite via Hardlink Path Traversal - CWE-22, CWE-59
  - Versao minima segura (OSV): 7.5.7
  - Ultima disponivel (npm): 7.5.13
  - Recomendacao: upgrade para 7.5.13 (major jump 6 -> 7 - risco de breaking changes na API de extracao)
- **GHSA-83g3-92jg-28cx** (CVE-2026-26960, HIGH)
  - Arbitrary File Read/Write via Hardlink Target Escape Through Symlink Chain - CWE-22
  - Versao minima segura (OSV): 7.5.8
  - Recomendacao: upgrade para 7.5.13 (major jump)
- **GHSA-8qq5-rm4j-mr97** (CVE-2026-23745, HIGH)
  - Arbitrary File Overwrite and Symlink Poisoning via Insufficient Path Sanitization - CWE-22
  - Versao minima segura (OSV): 7.5.3
  - Recomendacao: upgrade para 7.5.13 (major jump)
- **GHSA-9ppj-qmqm-q256** (CVE-2026-31802, HIGH)
  - Symlink Path Traversal via Drive-Relative Linkpath - CWE-22
  - Versao minima segura (OSV): 7.5.11
  - Recomendacao: upgrade para 7.5.13 (major jump)
- **GHSA-qffp-2rhf-9h96** (CVE-2026-29786, HIGH)
  - Hardlink Path Traversal via Drive-Relative Linkpath - CWE-22, CWE-59
  - Versao minima segura (OSV): 7.5.10
  - Recomendacao: upgrade para 7.5.13 (major jump)

Mitigacao: tar e arrastado por bcrypt -> @mapbox/node-pre-gyp. Atualizar bcrypt para 6.0.0 (que usa @mapbox/node-pre-gyp 2.x) deve trazer tar 7.x via cadeia.

#### follow-redirects @ 1.15.11 - 1 CVE
- **GHSA-r4q5-vmmm-2653** (sem CVE atribuido, MODERATE)
  - follow-redirects leaks Custom Authentication Headers to Cross-Domain Redirect Targets - CWE-200
  - Versao minima segura (OSV): 1.16.0
  - Ultima disponivel (npm): 1.16.0
  - Recomendacao: upgrade para 1.16.0 (mesmo major - patch direto). Trazido por axios; subir axios para 1.15.x ja resolve via re-resolucao.

### A02 - Cryptographic Failures (1 finding) (inferred)

#### jws @ 3.2.2 - 1 CVE
- **GHSA-869p-cjfg-cm3x** (CVE-2025-65945, HIGH) (inferred)
  - auth0/node-jws Improperly Verifies HMAC Signature - CWE-347 (inferred: signature verification belongs to crypto failures)
  - Versao minima segura (OSV): 3.2.3
  - Ultima disponivel (npm): 4.0.1
  - Recomendacao: upgrade para 3.2.3 (mesmo major - patch direto). Trazido por jsonwebtoken; aguardar release de jsonwebtoken que use jws >= 3.2.3 ou aplicar `overrides` no package.json.

### A03 - Injection (8 findings)

#### lodash @ 4.17.21 - 3 CVEs
- **GHSA-r5fr-rjxr-66jc** (CVE-2026-4800, HIGH)
  - lodash vulnerable to Code Injection via `_.template` imports key names - CWE-94
  - Versao minima segura (OSV): 4.18.0
  - Ultima disponivel (npm): 4.18.1
  - Recomendacao: upgrade para 4.18.1 (mesmo major)
- **GHSA-f23m-r3pf-42rh** (CVE-2026-2950, MODERATE) (inferred)
  - Prototype Pollution via array path bypass in `_.unset` and `_.omit` - CWE-1321 (inferred: prototype pollution = injection-class)
  - Versao minima segura (OSV): 4.18.0
  - Recomendacao: upgrade para 4.18.1 (mesmo major)
- **GHSA-xxjr-mmjv-4gpg** (CVE-2025-13465, MODERATE) (inferred)
  - Prototype Pollution Vulnerability in `_.unset` and `_.omit` functions - CWE-1321 (inferred)
  - Versao minima segura (OSV): 4.17.23
  - Recomendacao: upgrade para 4.18.1

#### nodemailer @ 6.9.16 - 3 CVEs (4 total - 1 em Outros)
- **GHSA-mm7p-fcc7-pg87** (CVE-2025-13033, MODERATE)
  - Email to an unintended domain due to Interpretation Conflict - CWE-20, CWE-436
  - Versao minima segura (OSV): 7.0.7
  - Ultima disponivel (npm): 8.0.6
  - Recomendacao: upgrade para 8.0.6 (major jump 6 -> 8 - revisar API; nodemailer mantem retrocompat alta)
- **GHSA-c7w3-x93f-qmm8** (sem CVE, LOW) (inferred)
  - SMTP command injection via unsanitized `envelope.size` parameter - CWE-93 (inferred: SMTP injection alinha com A03)
  - Versao minima segura (OSV): 8.0.4
  - Recomendacao: upgrade para 8.0.6 (major jump)
- **GHSA-vvjj-xcjg-gr5g** (sem CVE, MODERATE) (inferred)
  - SMTP Command Injection via CRLF in Transport name Option (EHLO/HELO) - CWE-93 (inferred)
  - Versao minima segura (OSV): 8.0.5
  - Recomendacao: upgrade para 8.0.6 (major jump)

#### qs @ 6.13.0 - 2 CVEs
- **GHSA-6rw7-vpxm-498p** (CVE-2025-15284, MODERATE)
  - arrayLimit bypass in bracket notation allows DoS via memory exhaustion - CWE-20
  - Versao minima segura (OSV): 6.14.1
  - Ultima disponivel (npm): 6.15.1
  - Recomendacao: upgrade para 6.15.1 (mesmo major). Trazido por express; subir express para 5.x ou aplicar override.
- **GHSA-w7fw-mjwx-w883** (CVE-2026-2391, LOW)
  - arrayLimit bypass in comma parsing allows denial of service - CWE-20
  - Versao minima segura (OSV): 6.14.2
  - Recomendacao: upgrade para 6.15.1 (mesmo major)

### A10 - Server-Side Request Forgery (SSRF) (2 findings)

#### axios @ 1.13.2 - 2 CVEs (3 total - 1 em Outros)
- **GHSA-3p68-rc4w-qgx5** (CVE-2025-62718, MODERATE)
  - Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF - CWE-441, CWE-918
  - Versao minima segura (OSV): 1.15.0
  - Ultima disponivel (npm): 1.15.2
  - Recomendacao: upgrade para 1.15.2 (mesmo major)
- **GHSA-fvcv-3m26-pcqx** (CVE-2026-40175, MODERATE)
  - Unrestricted Cloud Metadata Exfiltration via Header Injection Chain - CWE-113, CWE-444, CWE-918
  - Versao minima segura (OSV): 1.15.0
  - Recomendacao: upgrade para 1.15.2 (mesmo major)

---

## Pacotes Deprecated

### crypto @ 1.0.1 (DIRECT DEPENDENCY - alta prioridade)
- Mensagem oficial: "This package is no longer supported. It's now a built-in Node module. If you've depended on crypto, you should switch to the one that's built-in."
- Acao: **Remover do package.json** e usar `import crypto from 'node:crypto'` (Node.js >= 12). Esse pacote no npm e um placeholder que nao corresponde ao modulo nativo - pode causar confusao em deploy.

### Transitivas deprecated (cluster do bcrypt -> @mapbox/node-pre-gyp)

- **are-we-there-yet @ 2.0.0** - "This package is no longer supported." Sem substituto direto; sera removida ao subir bcrypt -> 6.0.0 (cadeia limpa).
- **gauge @ 3.0.2** - "This package is no longer supported." Sem substituto direto; idem (remove ao subir bcrypt).
- **inflight @ 1.0.6** - "This module is not supported, and leaks memory. Do not use it. Check out lru-cache..." **Vazamento de memoria documentado**. Sera removida ao subir glob/rimraf -> 9+ (que ja nao usam inflight).
- **npmlog @ 5.0.1** - "This package is no longer supported." Idem (remove ao subir bcrypt).
- **path-is-absolute @ 1.0.1** - "This package is no longer relevant as Node.js 0.12 is unmaintained." Idem.

**Recomendacao consolidada:** atualizar `bcrypt` de `5.1.1` para `6.0.0`. Isso usa `@mapbox/node-pre-gyp` 2.x, que tem cadeia de dependencias modernizada e elimina simultaneamente os 5 pacotes deprecated transitivos acima e ainda traz `tar` 7.x (corrigindo as 6 vulns HIGH de path traversal listadas em A01).

---

## Outros / Sem categorizacao OWASP (12 findings)

CVEs cujo CWE nao mapeia para nenhum top_cwe_id da OWASP Web Top 10 2021. Predominam ReDoS (CWE-1333, CWE-407) e DoS por consumo de recurso (CWE-400, CWE-770, CWE-754, CWE-703).

#### minimatch @ 3.1.2 - 3 CVEs (todas HIGH)
- **GHSA-23c5-xmqv-rm74** (CVE-2026-27904, HIGH) - ReDoS via nested *() extglobs - CWE-1333. Fixed_in: 10.2.3
- **GHSA-7r86-cg39-jmmj** (CVE-2026-27903, HIGH) - ReDoS combinatorial backtracking via GLOBSTAR - CWE-407. Fixed_in: 10.2.3
- **GHSA-3ppc-4f35-3m26** (CVE-2026-26996, HIGH) - ReDoS via repeated wildcards - CWE-1333. Fixed_in: 10.2.1
- Ultima disponivel (npm): 10.2.5
- Recomendacao: upgrade para 10.2.5 (major jump 3 -> 10 - **alto risco de breaking changes** na assinatura de API). Trazido transitivamente por glob 7.x; estrategia mais segura e subir bcrypt -> 6.0.0 (modernizando o cluster) ou usar `overrides` apontando para minimatch >= 9.

#### path-to-regexp @ 0.1.10 - 2 CVEs (todas HIGH)
- **GHSA-37ch-88jc-xwx2** (CVE-2026-4867, HIGH) - ReDoS via multiple route parameters - CWE-1333. Fixed_in: 0.1.13
- **GHSA-rhx6-c78j-4q9w** (CVE-2024-52798, HIGH) - ReDoS - CWE-1333. Fixed_in: 0.1.12
- Ultima disponivel (npm): 8.4.2
- Recomendacao: upgrade para `path-to-regexp` 0.1.13 via override (mesmo serie 0.1.x, mantem compat com express 4). Express 5.x ja usa `path-to-regexp` 8.x - alternativa estrutural e migrar express 4 -> 5.

#### tar @ 6.2.1 - 1 CVE adicional
- **GHSA-r6q2-hw4h-h46w** (CVE-2026-23950, HIGH) - Race Condition via Unicode Ligature Collisions on macOS APFS - CWE-176, CWE-367. Fixed_in: 7.5.4
- Recomendacao: upgrade para tar 7.5.13 (ja contemplado em A01).

#### axios @ 1.13.2 - 1 CVE adicional
- **GHSA-43fc-jf86-j433** (CVE-2026-25639, HIGH) - DoS via __proto__ Key in mergeConfig - CWE-754. Fixed_in: 1.13.5
- Recomendacao: upgrade para axios 1.15.2 (ja contemplado em A10).

#### express-rate-limit @ 8.0.1 - 1 CVE
- **GHSA-46wh-pxpv-q5gq** (CVE-2026-30827, HIGH) - IPv4-mapped IPv6 addresses bypass per-client rate limiting - CWE-770
- Versao minima segura (OSV): 8.2.2
- Ultima disponivel (npm): 8.4.1
- Recomendacao: upgrade para 8.4.1 (mesmo major - patch direto). **Critico para a postura de protecao** - se o servidor expoe dual-stack IPv4/IPv6, o rate-limit pode estar sendo trivialmente burlado hoje.

#### nodemailer @ 6.9.16 - 1 CVE adicional
- **GHSA-rcmh-qjqh-p98v** (CVE-2025-14874, HIGH) - DoS via recursive calls em addressparser - CWE-703. Fixed_in: 7.0.11
- Recomendacao: upgrade para nodemailer 8.0.6 (ja contemplado em A03).

#### brace-expansion @ 1.1.11 - 2 CVEs
- **GHSA-f886-m6hf-6m8v** (CVE-2026-33750, MODERATE) - Zero-step sequence causes process hang - CWE-400. Fixed_in: 5.0.5
- **GHSA-v6h2-p8h4-qcjw** (CVE-2025-5889, LOW) - ReDoS - CWE-400. Fixed_in: 2.0.2
- Ultima disponivel (npm): 5.0.5
- Recomendacao: upgrade para 2.0.2+ via override (mesma serie 1.x existe correção como 2.0.2). Trazido por minimatch 3.x; sera substituido pelo cluster ao atualizar bcrypt.

#### uuid @ 8.3.2 - 1 CVE
- **GHSA-w5hq-g745-h8pq** (sem CVE, MODERATE) - Missing buffer bounds check in v3/v5/v6 when buf is provided - CWE-1285, CWE-787. Fixed_in: 14.0.0
- Recomendacao: upgrade para 14.0.0 (major jump 8 -> 14, multiplos majors). Trazido por bcryptjs/bull; impacto baixo se nao usar v3/v5/v6 com buffer customizado.

---

## Plano de remediacao consolidado (em ordem de impacto)

1. **Atualizar `axios` 1.13.2 -> 1.15.2** (corrige 3 CVEs incl. 2x SSRF; mesmo major).
2. **Atualizar `express-rate-limit` 8.0.1 -> 8.4.1** (corrige bypass critico de rate-limit; mesmo major).
3. **Atualizar `nodemailer` 6.9.16 -> 8.0.6** (corrige 4 CVEs incl. SMTP injection; major jump - testar templates de email).
4. **Atualizar `bcrypt` 5.1.1 -> 6.0.0** (move cluster `@mapbox/node-pre-gyp` -> 2.x, eliminando 5 transitivas deprecated **e** trazendo `tar` 7.x que fecha 6 CVEs HIGH de path traversal; major jump - revisar API hash/compare).
5. **Adicionar `overrides` no package.json para path-to-regexp >= 0.1.13** (corrige 2 ReDoS HIGH em express 4.x sem migrar para express 5).
6. **Adicionar override para `jws` >= 3.2.3** (corrige falha de verificacao HMAC).
7. **Remover `crypto` do package.json** e usar `node:crypto` nativo.
8. **Avaliar migracao para `express` 5.x** (resolveria estruturalmente path-to-regexp e qs; major jump).

Sugestao de bloco `overrides` para package.json:

```json
"overrides": {
  "path-to-regexp": "^0.1.13",
  "jws": "^3.2.3",
  "qs": "^6.15.1",
  "lodash": "^4.18.1",
  "follow-redirects": "^1.16.0",
  "uuid": "^14.0.0"
}
```

---

## Apendice - Limitacoes

- Auditoria baseada exclusivamente em CVEs publicos da OSV.dev (consulta em 2026-04-25)
- Nao substitui Snyk/Dependabot/SAST/SCA continuo
- Nao executa analise estatica de uso real das funcoes vulneraveis no codigo da aplicacao - algumas vulns podem ser nao-exploraveis se a API afetada nao for chamada
- LLM Top 10 nao foi mapeado pois o projeto nao usa nenhum SDK de IA detectado (axios e usado para HTTP generico, nao para chamadas a LLM API)
- Caminhos de dependencia transitiva sao deduzidos por convencao (e.g. `bcrypt -> @mapbox/node-pre-gyp -> tar`); caminhos exatos podem ser confirmados com `npm ls <pkg>`
