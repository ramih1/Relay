import { NextResponse } from "next/server";
import { buildGoogleConnectUrl } from "@/lib/server/google-workspace";

function normalizeService(value: string | null) {
  if (value === "gmail" || value === "calendar" || value === "workspace") {
    return value;
  }
  return "workspace";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const service = normalizeService(url.searchParams.get("service"));
  const redirectPath = url.searchParams.get("redirect") || "/settings";

  try {
    const connectUrl = await buildGoogleConnectUrl(service, request.url, redirectPath);
    return NextResponse.redirect(connectUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start Google connection.";
    return NextResponse.redirect(new URL(`${redirectPath}?google=error&message=${encodeURIComponent(message)}`, request.url));
  }
}
