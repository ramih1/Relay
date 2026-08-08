import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, setSessionCookie, verifyCredentials } from "@/lib/server/auth";
import { assertSameOrigin, enforceRateLimit, jsonError } from "@/lib/server/http-security";

const schema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, "login", 10, 15 * 60 * 1000);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    const user = await verifyCredentials(parsed.data.email, parsed.data.password);
    const session = await createSession(user.id);
    const response = NextResponse.json({ user });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
