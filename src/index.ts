import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  FETCH_VULNERABILITIES_TOOL,
  TOOL_INPUT_JSON_SCHEMA,
  ToolInputSchema,
  fetchVulnerabilities,
} from "./tools/fetch-vulnerabilities.js";

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
      inputSchema: TOOL_INPUT_JSON_SCHEMA,
    },
  ],
}));

server.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== FETCH_VULNERABILITIES_TOOL) {
    return {
      content: [{ type: "text", text: `Tool desconhecida: ${name}` }],
      isError: true,
    };
  }

  const parsed = ToolInputSchema.safeParse(args);
  if (!parsed.success) {
    return {
      content: [
        {
          type: "text",
          text: `Argumentos invalidos para ${name}: ${parsed.error.issues
            .map((i) => i.message)
            .join("; ")}`,
        },
      ],
      isError: true,
    };
  }

  const result = await fetchVulnerabilities(parsed.data);
  if ("isError" in result) {
    return {
      content: [{ type: "text", text: result.message }],
      isError: true,
    };
  }
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
