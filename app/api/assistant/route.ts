import { NextResponse } from "next/server";
import { submitRelayCommand } from "@/lib/server/relay-store";
import { getRequestUser, requireUser } from "@/lib/server/auth";
import { assertSameOrigin, enforceRateLimit, jsonError } from "@/lib/server/http-security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, "assistant", 30, 60 * 1000);
    const user = await getRequestUser(request);
    requireUser(user);
    const payload = (await request.json()) as { input?: string };

    if (!payload.input?.trim()) {
      return NextResponse.json({ error: "Command input is required." }, { status: 400 });
    }

    return NextResponse.json(await submitRelayCommand(user, payload.input));
  } catch (error) {
    return jsonError(error);
  }
}
