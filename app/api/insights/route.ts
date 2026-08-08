import { NextResponse } from "next/server";
import { getDashboardInsights } from "@/lib/server/relay-insights";
import { getRequestUser, requireUser } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/http-security";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    requireUser(user);
    return NextResponse.json(await getDashboardInsights(user));
  } catch (error) {
    return jsonError(error);
  }
}
