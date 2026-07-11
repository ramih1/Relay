export class AIProviderError extends Error {
  code: "unavailable" | "timeout" | "invalid_response" | "configuration";

  constructor(
    message: string,
    code: AIProviderError["code"],
  ) {
    super(message);
    this.name = "AIProviderError";
    this.code = code;
  }
}

export function getAIUnavailableMessage(model = process.env.OLLAMA_MODEL || "qwen3:8b") {
  return `Relay could not connect to Ollama. Make sure Ollama is installed and running, then run: ollama serve && ollama pull ${model}`;
}
