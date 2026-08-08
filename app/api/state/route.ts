import { NextResponse } from "next/server";
import { applyRelayMutation, getRelayState } from "@/lib/server/relay-store";
import type { RelayMutationRequest } from "@/lib/types";
import { getRequestUser, requireUser } from "@/lib/server/auth";
import { assertSameOrigin, jsonError } from "@/lib/server/http-security";
import { relayMutationSchema } from "@/lib/server/relay-mutation-schema";

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request);
    requireUser(user);
    return NextResponse.json(await getRelayState(user));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await getRequestUser(request);
    requireUser(user);
    const parsed = relayMutationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid workspace update." }, { status: 400 });
    }
    const payload = parsed.data as RelayMutationRequest;
    return NextResponse.json(await applyRelayMutation(user, payload));
  } catch (error) {
    return jsonError(error);
  }
}
