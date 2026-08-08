import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let database: "connected" | "not_configured" | "unavailable" = usesDatabase() ? "connected" : "not_configured";
  if (usesDatabase()) {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "unavailable";
    }
  }
  const healthy = process.env.NODE_ENV !== "production" ? database !== "unavailable" : database === "connected";
  return NextResponse.json({
    status: healthy ? "ok" : "degraded",
    database,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || process.env.npm_package_version || "development",
    latencyMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
