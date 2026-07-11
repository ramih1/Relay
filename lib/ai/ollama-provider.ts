import { AIProviderError, getAIUnavailableMessage } from "@/lib/ai/errors";
import type { GenerateStructuredOptions, AIProvider } from "@/lib/ai/provider";
import { toJSONSchema, type ZodType } from "zod";

type OllamaChatResponse = {
  message?: { content?: string };
};

const DEFAULT_BASE_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "qwen3:4b";
const DEFAULT_TIMEOUT_MS = 90_000;

export function getOllamaConfig() {
  return {
    baseUrl: (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    model: process.env.OLLAMA_MODEL || DEFAULT_MODEL,
    timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
  };
}

export class OllamaProvider implements AIProvider {
  async generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<T> {
    const config = getOllamaConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(`${config.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.model,
          stream: false,
          format: toJSONSchema(options.schema as ZodType),
          think: false,
          messages: [
            { role: "system", content: options.systemPrompt },
            { role: "user", content: options.userPrompt },
          ],
          options: {
            temperature: options.temperature ?? 0.1,
            num_ctx: Number(process.env.OLLAMA_CONTEXT_SIZE || 4_096),
          },
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new AIProviderError(
          detail.includes("model")
            ? `Ollama model ${config.model} is not available. Run: ollama pull ${config.model}`
            : getAIUnavailableMessage(),
          "unavailable",
        );
      }

      const payload = (await response.json()) as OllamaChatResponse;
      const content = payload.message?.content;
      if (!content) {
        throw new AIProviderError("Ollama returned an empty response.", "invalid_response");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new AIProviderError("Ollama returned invalid JSON.", "invalid_response");
      }

      try {
        return options.parse(parsed);
      } catch {
        throw new AIProviderError("Ollama returned JSON that did not match Relay's schema.", "invalid_response");
      }
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new AIProviderError("Ollama took too long to respond. Try again or use a smaller local model.", "timeout");
      }
      throw new AIProviderError(getAIUnavailableMessage(), "unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function checkOllamaHealth() {
  const config = getOllamaConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(`${config.baseUrl}/api/tags`, { signal: controller.signal });
    if (!response.ok) {
      return { status: "error" as const, model: config.model, message: getAIUnavailableMessage() };
    }
    const payload = (await response.json()) as { models?: Array<{ name?: string }> };
    const modelAvailable = (payload.models ?? []).some((model) => model.name === config.model);
    return modelAvailable
      ? { status: "connected" as const, model: config.model, message: "Ollama is connected and the configured model is available." }
      : { status: "model_missing" as const, model: config.model, message: `Run: ollama pull ${config.model}` };
  } catch {
    return { status: "not_connected" as const, model: config.model, message: getAIUnavailableMessage() };
  } finally {
    clearTimeout(timeout);
  }
}
