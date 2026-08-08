import assert from "node:assert/strict";
import test from "node:test";
import { AuthError } from "@/lib/server/auth";
import { assertSameOrigin } from "@/lib/server/http-security";
import { relayMutationSchema } from "@/lib/server/relay-mutation-schema";
import { decryptGoogleTokens, encryptGoogleTokens } from "@/lib/server/relay-secrets";

test("same-origin protection rejects cross-site mutations", () => {
  const request = new Request("https://relay.example/api/state", {
    headers: { origin: "https://attacker.example", host: "relay.example", "sec-fetch-site": "cross-site" },
  });
  assert.throws(() => assertSameOrigin(request), AuthError);
});
test("same-origin protection accepts the application origin", () => {
  const request = new Request("https://relay.example/api/state", {
    headers: { origin: "https://relay.example", host: "relay.example", "sec-fetch-site": "same-origin" },
  });
  assert.doesNotThrow(() => assertSameOrigin(request));
});

test("workspace mutations reject unknown fields and invalid health values", () => {
  assert.equal(relayMutationSchema.safeParse({ type: "delete_task", taskId: "task-1", userId: "another-user" }).success, false);
  assert.equal(relayMutationSchema.safeParse({
    type: "add_workout",
    input: { activity: "Run", durationMinutes: 0, intensity: "extreme", performedAt: new Date().toISOString() },
  }).success, false);
});

test("Google tokens are encrypted at rest and recover exactly", () => {
  const previous = process.env.RELAY_ENCRYPTION_KEY;
  process.env.RELAY_ENCRYPTION_KEY = "test-encryption-key-with-enough-entropy";
  const tokens = { accessToken: "secret-access-token", refreshToken: "secret-refresh-token", scope: ["scope-a"], expiresAt: Date.now() + 60_000 };
  const encrypted = encryptGoogleTokens(tokens);
  assert.equal(encrypted.includes(tokens.accessToken), false);
  assert.deepEqual(decryptGoogleTokens(encrypted), tokens);
  if (previous === undefined) delete process.env.RELAY_ENCRYPTION_KEY;
  else process.env.RELAY_ENCRYPTION_KEY = previous;
});
