import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getOperatorSession } from "@/lib/auth/session";
import type { OperatorRole, OperatorSession } from "@/types/club";

export async function requireApiSession() {
  const session = await getOperatorSession();
  if (!session) {
    return null;
  }
  return session;
}

export function unauthorizedResponse() {
  return NextResponse.json({ message: "Avval tizimga kiring" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ message: "Bu amal uchun ruxsat yetarli emas" }, { status: 403 });
}

export function hasRoleAccess(session: OperatorSession, allowedRoles: OperatorRole[]) {
  return allowedRoles.includes(session.role);
}

export async function requireApiRole(allowedRoles: OperatorRole[]) {
  const session = await requireApiSession();
  if (!session) {
    return { session: null, response: unauthorizedResponse() } as const;
  }

  if (!hasRoleAccess(session, allowedRoles)) {
    return { session: null, response: forbiddenResponse() } as const;
  }

  return { session, response: null } as const;
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Tekshiruv xatosi";
    return NextResponse.json({ message }, { status: 400 });
  }

  const message = error instanceof Error ? error.message : "Server xatosi";
  const status =
    message.includes("DATABASE_URL") || message.includes("AUTH_SESSION_SECRET") ? 500 : 400;

  return NextResponse.json({ message }, { status });
}

export function ok<T>(payload: T, session?: OperatorSession) {
  return NextResponse.json(
    session
      ? {
          ...payload,
          operator: session,
        }
      : payload,
  );
}
