import { NextResponse } from "next/server";
import { disconnectGoogleWorkspace } from "@/lib/server/google-workspace";
import { getRequestUser, requireUser } from "@/lib/server/auth";
import { assertSameOrigin } from "@/lib/server/http-security";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const requestedRedirect = url.searchParams.get("redirect");
  const redirectPath = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//") ? requestedRedirect : "/settings";

  try {
    assertSameOrigin(request);
    const user = await getRequestUser(request);
    requireUser(user);
    await disconnectGoogleWorkspace(user.id);
    return NextResponse.redirect(new URL(`${redirectPath}?google=disconnected`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect Google Workspace.";
    return NextResponse.redirect(new URL(`${redirectPath}?google=error&message=${encodeURIComponent(message)}`, request.url));
  }
}
