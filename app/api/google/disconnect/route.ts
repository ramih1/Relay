import { NextResponse } from "next/server";
import { disconnectGoogleWorkspace } from "@/lib/server/google-workspace";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectPath = url.searchParams.get("redirect") || "/settings";

  try {
    await disconnectGoogleWorkspace();
    return NextResponse.redirect(new URL(`${redirectPath}?google=disconnected`, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect Google Workspace.";
    return NextResponse.redirect(new URL(`${redirectPath}?google=error&message=${encodeURIComponent(message)}`, request.url));
  }
}
