import { NextResponse } from "next/server";
import { checkOllamaHealth } from "@/lib/ai/ollama-provider";

export async function GET() {
  return NextResponse.json(await checkOllamaHealth(), { headers: { "Cache-Control": "no-store" } });
}
