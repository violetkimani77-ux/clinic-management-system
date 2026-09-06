import { NextResponse } from "next/server";
import { verifyMfaLogin } from "@/lib/auth/mfa-login";
import { getClientIp, getUserAgent } from "@/lib/auth/security";
import { SESSION_COOKIE } from "@/lib/auth/session";

const SESSION_MAX_AGE = 60 * 60 * 8;

export async function POST(request: Request) {
  let body: { challengeToken?: unknown; code?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.challengeToken !== "string" || typeof body.code !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.challengeToken.trim() || !body.code.trim()) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await verifyMfaLogin(body.challengeToken, body.code, {
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  });

  if (result.status === "failure") {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, result.session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    expires: result.session.expiresAt,
  });

  return response;
}
