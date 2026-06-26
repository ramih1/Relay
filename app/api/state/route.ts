import { NextResponse } from "next/server";
import { applyJarvisMutation, getJarvisState } from "@/lib/server/jarvis-store";
import type { JarvisMutationRequest } from "@/lib/types";

export async function GET() {
  return NextResponse.json(getJarvisState());
}

export async function POST(request: Request) {
  const payload = (await request.json()) as JarvisMutationRequest;
  return NextResponse.json(applyJarvisMutation(payload));
}
