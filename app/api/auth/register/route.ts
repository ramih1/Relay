import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, registerUser, setSessionCookie } from "@/lib/server/auth";
import { assertSameOrigin, enforceRateLimit, jsonError } from "@/lib/server/http-security";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, "register", 8, 15 * 60 * 1000);
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid name, email, and password." }, { status: 400 });
    const user = await registerUser(parsed.data);
    const session = await createSession(user.id);
    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
