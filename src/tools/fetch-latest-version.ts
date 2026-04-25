import { z } from "zod";
import {
  NpmManifestSchema,
  normalizeNpmManifest,
  type LatestVersionReport,
} from "../lib/npm-registry-normalize.js";

export const FETCH_LATEST_VERSION_TOOL = "fetch_latest_version";

export const ToolInputSchema = z.object({
  name: z.string().min(1),
  ecosystem: z.literal("npm"),
});

export type ToolInput = z.infer<typeof ToolInputSchema>;

export const TOOL_INPUT_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    name: { type: "string", minLength: 1 },
    ecosystem: { type: "string", enum: ["npm"] },
  },
  required: ["name", "ecosystem"],
  additionalProperties: false,
};

export interface ToolError {
  isError: true;
  message: string;
}

export type ToolSuccess = LatestVersionReport & { queried_at: string };
export type ToolResult = ToolSuccess | ToolError;

const REGISTRY_BASE = "https://registry.npmjs.org";
const TIMEOUT_MS = 10_000;

export async function fetchLatestVersion(input: ToolInput): Promise<ToolResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = `${REGISTRY_BASE}/${encodeURIComponent(input.name)}/latest`;
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });

    if (res.status === 404) {
      return {
        isError: true,
        message: `Pacote '${input.name}' nao encontrado no registry npm (HTTP 404).`,
      };
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        isError: true,
        message: `Falha ao consultar registry npm: ${detail || "resposta sem detalhe"} (HTTP ${res.status}).`,
      };
    }

    const json: unknown = await res.json();
    const validated = NpmManifestSchema.parse(json);
    const normalized = normalizeNpmManifest(validated, {
      name: input.name,
      ecosystem: input.ecosystem,
    });
    return {
      ...normalized,
      queried_at: new Date().toISOString(),
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return {
      isError: true,
      message: `Falha ao consultar registry npm: ${reason}.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
