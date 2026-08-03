import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  cookies().delete(ADMIN_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
