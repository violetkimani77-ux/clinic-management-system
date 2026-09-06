import { NextResponse } from "next/server";
import { authenticateStaff } from "@/lib/auth/login";
import { getClientIp, getUserAgent } from "@/lib/auth/security";
import { SESSION_COOKIE } from "@/lib/auth/session";

const SESSION_MAX_AGE = 60 * 60 * 8;

/** Authenticates staff and returns either a session or a short-lived MFA challenge. */
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.email.trim() || !body.password) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await authenticateStaff(body.email, body.password, {
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  });

  if (result.status === "failure") {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  if (result.status === "mfa_required") {
    return NextResponse.json({ ok: true, mfaRequired: true, challengeToken: result.challengeToken });
  }

  const response = NextResponse.json({ ok: true, mfaRequired: false });
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
