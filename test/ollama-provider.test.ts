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
