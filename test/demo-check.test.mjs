import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateGoogleOAuth,
  findConfiguredModel,
  parseEnv,
} from "../scripts/demo-check.mjs";

test("parseEnv handles quoted values and comments", () => {
  assert.deepEqual(parseEnv('OLLAMA_MODEL="qwen3:8b"\n# ignored\nEMPTY=""\n'), {
    OLLAMA_MODEL: "qwen3:8b",
    EMPTY: "",
  });
});

test("findConfiguredModel accepts Ollama's tagged model name", () => {
  assert.equal(findConfiguredModel([{ name: "qwen3:8b" }], "qwen3:8b"), true);
  assert.equal(findConfiguredModel([{ name: "qwen3:latest" }], "qwen3:8b"), false);
});

test("Google OAuth is optional when all credentials are absent", () => {
  assert.deepEqual(evaluateGoogleOAuth({}), { configured: false, partial: false });
});

test("Google OAuth remains optional when only the default redirect URI is present", () => {
  assert.deepEqual(
    evaluateGoogleOAuth({ GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3000/api/google/callback" }),
    { configured: false, partial: false },
  );
});

test("Google OAuth is marked partial when only some credentials exist", () => {
  assert.deepEqual(evaluateGoogleOAuth({ GOOGLE_CLIENT_ID: "client" }), {
    configured: false,
    partial: true,
  });
});

test("Google OAuth is configured only with client, secret, and redirect URI", () => {
  assert.deepEqual(
    evaluateGoogleOAuth({
      GOOGLE_CLIENT_ID: "client",
      GOOGLE_CLIENT_SECRET: "secret",
      GOOGLE_OAUTH_REDIRECT_URI: "http://localhost:3000/api/google/callback",
    }),
    { configured: true, partial: false },
  );
});
