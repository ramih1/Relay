import type { CalendarEvent, EmailDraft } from "@/lib/types";
import {
  clearGoogleTokens,
  consumePendingGoogleOAuth,
  getGoogleTokens,
  saveGoogleTokens,
  savePendingGoogleOAuth,
} from "@/lib/server/relay-secrets";

type GoogleCalendarResult = {
  id: string;
  htmlLink?: string;
};

type GoogleDraftResult = {
  id: string;
  messageId?: string;
};

const calendarTimeZone = process.env.GOOGLE_CALENDAR_TIMEZONE || "America/Toronto";
const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
const googleAuthEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
const googleTokenEndpoint = "https://oauth2.googleapis.com/token";
const gmailScope = "https://www.googleapis.com/auth/gmail.compose";
const calendarScope = "https://www.googleapis.com/auth/calendar.events";

type GoogleOAuthService = "gmail" | "calendar" | "workspace";

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function parseTimeParts(input: string) {
  const trimmed = input.replace(/\s+/g, " ").trim().toLowerCase();
  const match = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)?/i);
  if (!match) {
    return { hour: 9, minute: 0 };
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  }
  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
}

function nextWeekdayIndex(targetWeekday: number, from: Date) {
  const delta = (targetWeekday - from.getDay() + 7) % 7;
  return delta === 0 ? 7 : delta;
}

function parseHumanDateTime(input: string) {
  const source = input.replace(/,/g, "").replace(/\s+/g, " ").trim();
  const lower = source.toLowerCase();
  const now = new Date();
  const base = new Date(now);

  if (lower.includes("tomorrow")) {
    base.setDate(base.getDate() + 1);
  } else if (!lower.includes("today") && !/\b\d{1,2}:\d{2}\s*[ap]m\b/i.test(lower)) {
    const weekdayIndex = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ].findIndex((day) => lower.includes(day));

    if (weekdayIndex >= 0) {
      base.setDate(base.getDate() + nextWeekdayIndex(weekdayIndex, now));
    }
  }

  const { hour, minute } = parseTimeParts(source);
  base.setHours(hour, minute, 0, 0);

  return base.toISOString();
}

function buildMimeDraft(draft: EmailDraft, fromEmail?: string) {
  const headers = [
    fromEmail ? `From: ${fromEmail}` : null,
    `To: ${draft.recipient || "undisclosed-recipients:;"}`,
    `Subject: ${draft.subject || "Draft from Relay"}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    draft.body || "",
  ].filter(Boolean);

  return headers.join("\r\n");
}

async function googleRequest<T>(url: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Google API request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function getGoogleWorkspaceConfig() {
  const oauthConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return {
    googleOAuthConfigured: oauthConfigured,
    gmailConfigured: Boolean(process.env.GOOGLE_GMAIL_ACCESS_TOKEN),
    calendarConfigured: Boolean(process.env.GOOGLE_CALENDAR_ACCESS_TOKEN),
  };
}

function requiredScopesFor(service: GoogleOAuthService) {
  if (service === "gmail") {
    return [gmailScope];
  }
  if (service === "calendar") {
    return [calendarScope];
  }
  return [gmailScope, calendarScope];
}

function redirectUriFrom(requestUrl?: string) {
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  }

  if (!requestUrl) {
    throw new Error("GOOGLE_OAUTH_REDIRECT_URI is required when no request URL is available.");
  }

  return new URL("/api/google/callback", requestUrl).toString();
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured.");
  }

  const response = await fetch(googleTokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Google token refresh failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  const current = await getGoogleTokens();
  const nextTokens = {
    accessToken: data.access_token,
    refreshToken,
    scope: data.scope ? data.scope.split(" ") : current?.scope ?? [],
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : current?.expiresAt,
    tokenType: data.token_type ?? current?.tokenType,
  };

  await saveGoogleTokens(nextTokens);
  return nextTokens;
}

export async function getGoogleAccessToken(requiredScopes: string[]) {
  const envToken =
    requiredScopes.includes(gmailScope) && !requiredScopes.includes(calendarScope)
      ? process.env.GOOGLE_GMAIL_ACCESS_TOKEN
      : requiredScopes.includes(calendarScope) && !requiredScopes.includes(gmailScope)
        ? process.env.GOOGLE_CALENDAR_ACCESS_TOKEN
        : undefined;

  if (envToken) {
    return envToken;
  }

  const tokens = await getGoogleTokens();
  if (!tokens?.accessToken) {
    throw new Error("Google Workspace is not connected yet.");
  }

  const missingScopes = requiredScopes.filter((scope) => !tokens.scope.includes(scope));
  if (missingScopes.length > 0) {
    throw new Error("Google Workspace is connected, but the required scope is missing. Reconnect and approve the requested scopes.");
  }

  if (tokens.expiresAt && tokens.expiresAt <= Date.now() + 60_000) {
    if (!tokens.refreshToken) {
      throw new Error("Google access token expired and no refresh token is available. Reconnect Google Workspace.");
    }
    const refreshed = await refreshGoogleAccessToken(tokens.refreshToken);
    return refreshed.accessToken;
  }

  return tokens.accessToken;
}

export async function getGoogleConnectionStatus() {
  const config = getGoogleWorkspaceConfig();
  const tokens = await getGoogleTokens();
  const scopes = tokens?.scope ?? [];

  return {
    googleOAuthConfigured: config.googleOAuthConfigured,
    gmailConfigured: config.gmailConfigured || scopes.includes(gmailScope),
    calendarConfigured: config.calendarConfigured || scopes.includes(calendarScope),
    connectedViaOAuth: Boolean(tokens?.accessToken),
  };
}

export async function buildGoogleConnectUrl(service: GoogleOAuthService, requestUrl: string, redirectPath?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const nonce = crypto.randomUUID();
  const redirectUri = redirectUriFrom(requestUrl);
  await savePendingGoogleOAuth({
    nonce,
    service,
    redirectPath,
    createdAt: Date.now(),
  });

  const url = new URL(googleAuthEndpoint);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", requiredScopesFor(service).join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", nonce);

  return url.toString();
}

export async function exchangeGoogleCode(code: string, state: string, requestUrl: string) {
  const pending = await consumePendingGoogleOAuth(state);
  if (!pending) {
    throw new Error("Google OAuth state is invalid or expired.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth client credentials are not configured.");
  }

  const response = await fetch(googleTokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUriFrom(requestUrl),
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Google token exchange failed with ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  const current = await getGoogleTokens();

  await saveGoogleTokens({
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? current?.refreshToken,
    scope: data.scope ? data.scope.split(" ") : requiredScopesFor(pending.service),
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    tokenType: data.token_type,
  });

  return pending;
}

export async function disconnectGoogleWorkspace() {
  await clearGoogleTokens();
}

export async function createGoogleGmailDraft(draft: EmailDraft, fromEmail?: string): Promise<GoogleDraftResult> {
  const accessToken = await getGoogleAccessToken([gmailScope]);

  const raw = encodeBase64Url(buildMimeDraft(draft, fromEmail));
  const result = await googleRequest<{ id: string; message?: { id?: string } }>(
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        message: {
          raw,
        },
      }),
    },
  );

  return {
    id: result.id,
    messageId: result.message?.id,
  };
}

export async function createGoogleCalendarEvent(event: CalendarEvent): Promise<GoogleCalendarResult> {
  const accessToken = await getGoogleAccessToken([calendarScope]);

  const result = await googleRequest<{ id: string; htmlLink?: string }>(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        summary: event.title,
        description: event.detail,
        location: event.location,
        start: {
          dateTime: parseHumanDateTime(event.start),
          timeZone: calendarTimeZone,
        },
        end: {
          dateTime: parseHumanDateTime(event.end),
          timeZone: calendarTimeZone,
        },
      }),
    },
  );

  return {
    id: result.id,
    htmlLink: result.htmlLink,
  };
}
