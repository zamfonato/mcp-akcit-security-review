import { z } from "zod";
import {
  OsvQueryResponseSchema,
  normalizeOsv,
  type NormalizedReport,
} from "../lib/osv-normalize.js";

export const FETCH_VULNERABILITIES_TOOL = "fetch_vulnerabilities";

export const ToolInputSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  ecosystem: z.literal("npm"),
});

export type ToolInput = z.infer<typeof ToolInputSchema>;

export const TOOL_INPUT_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    name: { type: "string", minLength: 1 },
    version: { type: "string", minLength: 1 },
    ecosystem: { type: "string", enum: ["npm"] },
  },
  required: ["name", "version", "ecosystem"],
  additionalProperties: false,
};

export interface ToolError {
  isError: true;
  message: string;
}

export type ToolSuccess = NormalizedReport & { queried_at: string };
export type ToolResult = ToolSuccess | ToolError;

const OSV_ENDPOINT = "https://api.osv.dev/v1/query";
const TIMEOUT_MS = 10_000;

const OsvErrorBodySchema = z.object({
  code: z.number().optional(),
  message: z.string().optional(),
});

export async function fetchVulnerabilities(input: ToolInput): Promise<ToolResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OSV_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        version: input.version,
        package: { name: input.name, ecosystem: input.ecosystem },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const rawBody: unknown = await res.json().catch(() => ({}));
      const parsed = OsvErrorBodySchema.safeParse(rawBody);
      const apiMsg = parsed.success ? parsed.data.message : undefined;
      return {
        isError: true,
        message: `Falha ao consultar OSV.dev: ${apiMsg ?? "resposta de erro sem detalhe"} (HTTP ${res.status}).`,
      };
    }

    const json: unknown = await res.json();
    const validated = OsvQueryResponseSchema.parse(json);
    const normalized = normalizeOsv(validated, input);
    return {
      ...normalized,
      queried_at: new Date().toISOString(),
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      message: `Falha ao consultar OSV.dev: ${reason}.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
