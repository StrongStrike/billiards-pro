import { NextResponse } from "next/server";

import { logoutOperator } from "@/lib/auth/session";

export async function POST() {
  await logoutOperator();
  return NextResponse.json({ ok: true });
}
