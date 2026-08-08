import { NextResponse } from "next/server";
import { clearSessionCookie, revokeRequestSession } from "@/lib/server/auth";
import { assertSameOrigin, jsonError } from "@/lib/server/http-security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await revokeRequestSession(request);
    const response = NextResponse.json({ success: true });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
