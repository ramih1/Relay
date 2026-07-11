export interface GenerateStructuredOptions<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: unknown;
  parse: (value: unknown) => T;
  temperature?: number;
}

export interface AIProvider {
  generateStructured<T>(options: GenerateStructuredOptions<T>): Promise<T>;
}

export function getAIProvider(): AIProvider {
  return new OllamaProvider();
}

import { OllamaProvider } from "@/lib/ai/ollama-provider";
