import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  FETCH_VULNERABILITIES_TOOL,
  TOOL_INPUT_JSON_SCHEMA as VULNS_TOOL_INPUT_JSON_SCHEMA,
  ToolInputSchema as VulnsToolInputSchema,
  fetchVulnerabilities,
} from "./tools/fetch-vulnerabilities.js";
import {
  FETCH_LATEST_VERSION_TOOL,
  TOOL_INPUT_JSON_SCHEMA as LATEST_TOOL_INPUT_JSON_SCHEMA,
  ToolInputSchema as LatestToolInputSchema,
  fetchLatestVersion,
} from "./tools/fetch-latest-version.js";
import {
  DOC_SECURITY_REVIEW_PROMPT,
  renderDocSecurityReviewPrompt,
  type DocSecurityReviewArgs,
} from "./prompts/doc-security-review.js";

const server = new Server(
  {
    name: "@zamfonato/mcp-akcit-security-review",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: FETCH_VULNERABILITIES_TOOL,
      description:
        "Consulta a base OSV.dev por vulnerabilidades conhecidas que afetam um pacote npm em uma versao especifica. Retorna lista normalizada de CVEs com severidade, CVSS, CWE, versao corrigida e link de advisory.",
      inputSchema: VULNS_TOOL_INPUT_JSON_SCHEMA,
    },
    {
      name: FETCH_LATEST_VERSION_TOOL,
      description:
        "Consulta o registry npm pela ultima versao publicada de um pacote. Retorna latest_version, deprecated, license, homepage e repository_url normalizados.",
      inputSchema: LATEST_TOOL_INPUT_JSON_SCHEMA,
    },
  ],
}));

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: DOC_SECURITY_REVIEW_PROMPT,
      description:
        "Audita dependencias Node.js do repositorio, classifica CVEs em OWASP Web Top 10, ativa lente OWASP LLM Top 10 quando aplicavel, e gera SECURITY-REVIEW.md no projeto auditado.",
      arguments: [
        {
          name: "repo_path",
          description:
            "Caminho absoluto do repositorio a auditar. Se omitido, usa o diretorio atual do cliente.",
          required: false,
        },
      ],
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === FETCH_VULNERABILITIES_TOOL) {
    const parsed = VulnsToolInputSchema.safeParse(args);
    if (!parsed.success) {
      return invalidArgs(name, parsed.error.issues.map((i) => i.message).join("; "));
    }
    const result = await fetchVulnerabilities(parsed.data);
    if ("isError" in result) return errorResult(result.message);
    return successResult(result);
  }

  if (name === FETCH_LATEST_VERSION_TOOL) {
    const parsed = LatestToolInputSchema.safeParse(args);
    if (!parsed.success) {
      return invalidArgs(name, parsed.error.issues.map((i) => i.message).join("; "));
    }
    const result = await fetchLatestVersion(parsed.data);
    if ("isError" in result) return errorResult(result.message);
    return successResult(result);
  }

  return errorResult(`Tool desconhecida: ${name}`);
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;
  if (name !== DOC_SECURITY_REVIEW_PROMPT) {
    throw new Error(`Prompt desconhecido: ${name}`);
  }
  const args: DocSecurityReviewArgs = {};
  if (rawArgs && typeof rawArgs === "object") {
    const candidate = (rawArgs as Record<string, unknown>)["repo_path"];
    if (typeof candidate === "string") {
      args.repo_path = candidate;
    }
  }
  return renderDocSecurityReviewPrompt(args);
});

function invalidArgs(toolName: string, msg: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: `Argumentos invalidos para ${toolName}: ${msg}`,
      },
    ],
    isError: true as const,
  };
}

function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function successResult(data: object) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
    structuredContent: data as { [key: string]: unknown },
  };
}

const transport = new StdioServerTransport();
await server.connect(transport);
