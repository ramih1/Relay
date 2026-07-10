import { NextResponse } from "next/server";
import { submitRelayCommand } from "@/lib/server/relay-store";

export async function POST(request: Request) {
  const payload = (await request.json()) as { input?: string };

  if (!payload.input?.trim()) {
    return NextResponse.json({ error: "Command input is required." }, { status: 400 });
  }

  return NextResponse.json(await submitRelayCommand(payload.input));
}
