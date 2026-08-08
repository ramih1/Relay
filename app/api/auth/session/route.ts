import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/server/auth";
import { jsonError } from "@/lib/server/http-security";

export async function GET(request: Request) {
  try {
    return NextResponse.json({ user: await getRequestUser(request) });
  } catch (error) {
    return jsonError(error);
  }
}
