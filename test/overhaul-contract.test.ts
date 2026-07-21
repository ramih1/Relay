import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const filesWithoutCalls = [
  "../lib/types.ts",
  "../lib/data.ts",
  "../lib/server/relay-store.ts",
  "../lib/ai/schemas.ts",
  "../lib/ai/classify-command.ts",
  "../components/relay-provider.tsx",
  "../components/relay-app.tsx",
  "../prisma/schema.prisma",
];

test("the calls domain is removed from the product", async () => {
  for (const relativePath of filesWithoutCalls) {
    const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bcall(?:s|ing|Request|Assistant|Followups)?\b/i, relativePath);
  }
});

test("the local model defaults to the 8 GB Mac profile", async () => {
  const provider = await readFile(new URL("../lib/ai/ollama-provider.ts", import.meta.url), "utf8");
  const exampleEnv = await readFile(new URL("../.env.example", import.meta.url), "utf8");

  assert.match(provider, /qwen3:1\.7b/);
  assert.match(exampleEnv, /OLLAMA_MODEL="qwen3:1\.7b"/);
  assert.match(exampleEnv, /OLLAMA_CONTEXT_SIZE="2048"/);
});

test("voice input is review-first progressive enhancement", async () => {
  const voiceButton = await readFile(
    new URL("../components/assistant/voice-input-button.tsx", import.meta.url),
    "utf8",
  );

  assert.match(voiceButton, /SpeechRecognition/);
  assert.match(voiceButton, /Listening/);
  assert.match(voiceButton, /Voice input is not supported/);
  assert.doesNotMatch(voiceButton, /submitCommand/);
});
