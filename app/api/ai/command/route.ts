import { NextResponse } from "next/server";
import { z } from "zod";
import { submitRelayCommand, getRelayState } from "@/lib/server/relay-store";
import { getRequestUser, requireUser } from "@/lib/server/auth";
import { assertSameOrigin, enforceRateLimit, jsonError } from "@/lib/server/http-security";

const requestSchema = z.object({
  message: z.string().trim().min(1, "Command input is required.").max(2_000, "Command input is too long."),
  timezone: z.string().trim().max(80).optional(),
  context: z.object({ selectedNoteId: z.string().optional(), currentPage: z.string().optional() }).optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, "ai-command", 30, 60 * 1000);
    const user = await getRequestUser(request);
    requireUser(user);
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid command." }, { status: 400 });
    }

    await submitRelayCommand(user, parsed.data.message, parsed.data.timezone);
    return NextResponse.json({ success: true, result: await getRelayState(user) });
  } catch (error) {
    return jsonError(error);
  }
}
