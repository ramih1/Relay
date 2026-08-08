import { NextResponse } from "next/server";
import { AuthError } from "@/lib/server/auth";

const attempts = new Map<string, { count: number; resetAt: number }>();

export function assertSameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") throw new AuthError("Cross-site request blocked.", 403);

  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestUrl = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
  const protocol = request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
  const expected = `${protocol}://${host}`;
  if (origin === expected) return;
  const originUrl = new URL(origin);
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (process.env.NODE_ENV !== "production" && loopback.has(originUrl.hostname) && loopback.has(new URL(expected).hostname) && originUrl.port === new URL(expected).port) return;
  throw new AuthError("Request origin is not allowed.", 403);
}

export function enforceRateLimit(request: Request, bucket: string, limit: number, windowMs: number) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const key = `${bucket}:${forwarded || "local"}`;
  const now = Date.now();
  if (attempts.size > 10_000) {
    for (const [attemptKey, attempt] of attempts) {
      if (attempt.resetAt <= now) attempts.delete(attemptKey);
    }
  }
  const current = attempts.get(key);
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (current.count >= limit) throw new AuthError("Too many requests. Please wait and try again.", 429);
  current.count += 1;
}

export function jsonError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Relay request failed", error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
