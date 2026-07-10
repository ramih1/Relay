import { NextResponse } from "next/server";
import { applyRelayMutation, getRelayState } from "@/lib/server/relay-store";
import type { RelayMutationRequest } from "@/lib/types";

export async function GET() {
  return NextResponse.json(await getRelayState());
}

export async function POST(request: Request) {
  const payload = (await request.json()) as RelayMutationRequest;
  return NextResponse.json(await applyRelayMutation(payload));
}
