import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";

import { OllamaProvider } from "../lib/ai/ollama-provider";

test("Ollama receives the structured output schema and reasoning is disabled", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    requestBody = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ message: { content: '{"ok":true}' } }));
  };

  try {
    const schema = z.object({ ok: z.literal(true) });
    const result = await new OllamaProvider().generateStructured({
      systemPrompt: "Return JSON",
      userPrompt: "Confirm",
      schema,
      parse: (value) => schema.parse(value),
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(requestBody?.think, false);
    assert.equal(typeof requestBody?.format, "object");
    assert.equal((requestBody?.format as { type?: string }).type, "object");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("offline errors explain how to start Ollama with the configured model", async () => {
  const originalFetch = globalThis.fetch;
  const originalModel = process.env.OLLAMA_MODEL;
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  process.env.OLLAMA_MODEL = "qwen3:1.7b";

  try {
    const schema = z.object({ ok: z.literal(true) });
    await assert.rejects(
      new OllamaProvider().generateStructured({
        systemPrompt: "Return JSON",
        userPrompt: "Confirm",
        schema,
        parse: (value) => schema.parse(value),
      }),
      (error: Error) => error.message.includes("ollama serve") && error.message.includes("ollama pull qwen3:1.7b"),
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalModel === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = originalModel;
  }
});
