import assert from "node:assert/strict";
import test from "node:test";
import { createGoogleCalendarEvent, createGoogleGmailDraft, deleteGoogleCalendarEvent, deleteGoogleGmailDraft } from "@/lib/server/google-workspace";
import { clearGoogleTokens, saveGoogleTokens } from "@/lib/server/relay-secrets";

const gmailScope = "https://www.googleapis.com/auth/gmail.compose";
const calendarScope = "https://www.googleapis.com/auth/calendar.events";

test("Google sync creates Gmail drafts and Calendar events with per-user credentials", async () => {
  const userId = `google-test-${crypto.randomUUID()}`;
  const originalFetch = global.fetch;
  const originalKey = process.env.RELAY_ENCRYPTION_KEY;
  process.env.RELAY_ENCRYPTION_KEY = "google-workspace-test-encryption-key";
  const requests: Array<{ url: string; method: string }> = [];
  try {
    await saveGoogleTokens(userId, {
      accessToken: "user-access-token",
      refreshToken: "user-refresh-token",
      scope: [gmailScope, calendarScope],
      expiresAt: Date.now() + 3_600_000,
    });
    global.fetch = async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      requests.push({ url, method });
      if (method === "DELETE") return new Response(null, { status: 204 });
      if (url.includes("gmail.googleapis.com")) return Response.json({ id: "draft-123", message: { id: "message-123" } });
      if (url.includes("googleapis.com/calendar")) return Response.json({ id: "event-123", htmlLink: "https://calendar.google.com/event-123" });
      return new Response("Unexpected request", { status: 500 });
    };

    const draft = await createGoogleGmailDraft(userId, {
      id: "draft-local",
      recipient: "professor@example.com",
      subject: "Project update",
      body: "Here is the update.",
      tone: "professional",
      status: "approved",
    });
    const event = await createGoogleCalendarEvent(userId, {
      id: "event-local",
      title: "Study block",
      detail: "Prepare project outline",
      start: "Tomorrow 3:00 PM",
      end: "Tomorrow 4:00 PM",
      tone: "teal",
    });
    await createGoogleGmailDraft(userId, {
      id: "draft-local",
      externalId: "draft-123",
      recipient: "professor@example.com",
      subject: "Updated project update",
      body: "Here is the revised update.",
      tone: "professional",
      status: "approved",
    });
    await createGoogleCalendarEvent(userId, {
      id: "event-local",
      externalId: "event-123",
      title: "Updated study block",
      detail: "Prepare project outline",
      start: "Tomorrow 3:00 PM",
      end: "Tomorrow 4:00 PM",
      tone: "teal",
    });
    await deleteGoogleGmailDraft(userId, "draft-123");
    await deleteGoogleCalendarEvent(userId, "event-123");
    assert.deepEqual(draft, { id: "draft-123", messageId: "message-123" });
    assert.deepEqual(event, { id: "event-123", htmlLink: "https://calendar.google.com/event-123" });
    assert.equal(requests.some(({ url, method }) => url.includes("gmail.googleapis.com") && method === "POST"), true);
    assert.equal(requests.some(({ url, method }) => url.includes("gmail.googleapis.com") && method === "PUT"), true);
    assert.equal(requests.some(({ url, method }) => url.includes("googleapis.com/calendar") && method === "POST"), true);
    assert.equal(requests.some(({ url, method }) => url.includes("googleapis.com/calendar") && method === "PATCH"), true);
    assert.equal(requests.filter(({ method }) => method === "DELETE").length, 2);
  } finally {
    global.fetch = originalFetch;
    await clearGoogleTokens(userId);
    if (originalKey === undefined) delete process.env.RELAY_ENCRYPTION_KEY;
    else process.env.RELAY_ENCRYPTION_KEY = originalKey;
  }
});

test("Google sync refreshes expired access tokens and surfaces API failures", async () => {
  const userId = `google-refresh-test-${crypto.randomUUID()}`;
  const originalFetch = global.fetch;
  const originalKey = process.env.RELAY_ENCRYPTION_KEY;
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  process.env.RELAY_ENCRYPTION_KEY = "google-refresh-test-encryption-key";
  process.env.GOOGLE_CLIENT_ID = "test-client";
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  try {
    await saveGoogleTokens(userId, {
      accessToken: "expired-token",
      refreshToken: "refresh-token",
      scope: [gmailScope],
      expiresAt: Date.now() - 1_000,
    });
    let refreshed = false;
    global.fetch = async (input) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/token")) {
        refreshed = true;
        return Response.json({ access_token: "fresh-token", expires_in: 3_600, scope: gmailScope, token_type: "Bearer" });
      }
      return new Response("Google temporarily unavailable", { status: 503 });
    };

    await assert.rejects(
      createGoogleGmailDraft(userId, {
        id: "draft-failure",
        recipient: "person@example.com",
        subject: "Retry test",
        body: "Please retry.",
        tone: "short",
        status: "approved",
      }),
      /Google temporarily unavailable/,
    );
    assert.equal(refreshed, true);
  } finally {
    global.fetch = originalFetch;
    await clearGoogleTokens(userId);
    if (originalKey === undefined) delete process.env.RELAY_ENCRYPTION_KEY;
    else process.env.RELAY_ENCRYPTION_KEY = originalKey;
    if (originalClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = originalClientSecret;
  }
});
