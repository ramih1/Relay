import { NextResponse } from "next/server";
import { getDashboardInsights } from "@/lib/server/relay-insights";

export async function GET() {
  return NextResponse.json(await getDashboardInsights());
}
