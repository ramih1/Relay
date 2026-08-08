import { NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/server/google-workspace";
import { getRequestUser } from "@/lib/server/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.redirect(new URL("/settings?google=error&message=authentication_required", request.url));
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(new URL(`/settings?google=error&message=${encodeURIComponent(oauthError)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?google=error&message=missing_callback_params", request.url));
  }

  try {
    const pending = await exchangeGoogleCode(user.id, code, state, request.url);
    const redirectPath = pending.redirectPath?.startsWith("/") && !pending.redirectPath.startsWith("//") ? pending.redirectPath : "/settings";
    return NextResponse.redirect(new URL(`${redirectPath}?google=connected&service=${pending.service}`, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to finish Google connection.";
    return NextResponse.redirect(new URL(`/settings?google=error&message=${encodeURIComponent(message)}`, request.url));
  }
}
