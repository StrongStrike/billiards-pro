import { createHmac, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { verifyPassword } from "@/lib/auth/password";
import { requireDatabase } from "@/lib/db/client";
import { operators } from "@/lib/db/schema";
import type { OperatorSession } from "@/types/club";

const AUTH_NOT_CONFIGURED_MESSAGE =
  "Operator auth sozlanmagan. DATABASE_URL va AUTH_SESSION_SECRET kerak.";
const SESSION_COOKIE_NAME = "billiards-operator-session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

function isAuthConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.AUTH_SESSION_SECRET);
}

function getAuthSecret() {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) {
    throw new Error(AUTH_NOT_CONFIGURED_MESSAGE);
  }

  return secret;
}

function signPayload(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
}

function createSessionToken(operatorId: string, expiresAt: number) {
  const payload = Buffer.from(JSON.stringify({ operatorId, expiresAt }), "utf8").toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

type ParsedSessionToken = {
  operatorId: string;
  expiresAt: number;
};

function parseSessionToken(token: string): ParsedSessionToken | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  let decoded: { operatorId?: string; expiresAt?: number };
  try {
    decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      operatorId?: string;
      expiresAt?: number;
    };
  } catch {
    return null;
  }

  if (!decoded.operatorId || !decoded.expiresAt || decoded.expiresAt <= Date.now()) {
    return null;
  }

  return {
    operatorId: decoded.operatorId,
    expiresAt: decoded.expiresAt,
  } satisfies ParsedSessionToken;
}

export function getAuthConfigurationMessage() {
  return AUTH_NOT_CONFIGURED_MESSAGE;
}

export async function getOperatorSession(): Promise<OperatorSession | null> {
  if (!isAuthConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) {
    return null;
  }

  const sessionToken = parseSessionToken(rawToken);
  if (!sessionToken) {
    return null;
  }

  const db = requireDatabase();
  const [operator] = await db
    .select()
    .from(operators)
    .where(eq(operators.id, sessionToken.operatorId))
    .limit(1);
  if (!operator || !operator.isActive) {
    return null;
  }

  return {
    id: operator.id,
    name: operator.fullName,
    email: operator.email,
    mode: "database",
  };
}

export async function requireOperatorSession() {
  const session = await getOperatorSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function loginOperator(email: string, password: string) {
  if (!isAuthConfigured()) {
    return { ok: false as const, message: AUTH_NOT_CONFIGURED_MESSAGE };
  }

  const db = requireDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const [operator] = await db
    .select()
    .from(operators)
    .where(eq(operators.email, normalizedEmail))
    .limit(1);
  if (!operator || !operator.isActive || !verifyPassword(password, operator.passwordHash)) {
    return { ok: false as const, message: "Email yoki parol noto'g'ri" };
  }

  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(operator.id, expiresAt), {
    ...SESSION_COOKIE_OPTIONS,
    expires: new Date(expiresAt),
    maxAge: SESSION_TTL_SECONDS,
  });

  return {
    ok: true as const,
    session: {
      id: operator.id,
      email: operator.email,
      name: operator.fullName,
      mode: "database" as const,
    },
  };
}

export async function logoutOperator() {
  if (!isAuthConfigured()) {
    return;
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...SESSION_COOKIE_OPTIONS,
    expires: new Date(0),
    maxAge: 0,
  });
}
