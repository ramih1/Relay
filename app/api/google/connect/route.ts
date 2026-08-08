import { NextResponse } from "next/server";
import { buildGoogleConnectUrl } from "@/lib/server/google-workspace";
import { getRequestUser, requireUser } from "@/lib/server/auth";

function normalizeService(value: string | null) {
  if (value === "gmail" || value === "calendar" || value === "workspace") {
    return value;
  }
  return "workspace";
}

function safeRedirect(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/settings";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const service = normalizeService(url.searchParams.get("service"));
  const redirectPath = safeRedirect(url.searchParams.get("redirect"));

  try {
    const user = await getRequestUser(request);
    requireUser(user);
    const connectUrl = await buildGoogleConnectUrl(user.id, service, request.url, redirectPath);
    return NextResponse.redirect(connectUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start Google connection.";
    return NextResponse.redirect(new URL(`${redirectPath}?google=error&message=${encodeURIComponent(message)}`, request.url));
  }
}
