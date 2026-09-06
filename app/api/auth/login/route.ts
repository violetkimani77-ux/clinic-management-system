import { NextResponse } from "next/server";
import { authenticateStaff } from "@/lib/auth/login";
import { getClientIp, getUserAgent } from "@/lib/auth/security";
import { SESSION_COOKIE } from "@/lib/auth/session";

const SESSION_MAX_AGE = 60 * 60 * 8;

/** Authenticates staff and returns a clinic-scoped session, MFA challenge, or clinic-selection result. */
export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; clinicId?: unknown };

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

  const clinicId = typeof body.clinicId === "string" && body.clinicId.trim() ? body.clinicId : undefined;
  const result = await authenticateStaff(body.email, body.password, {
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
  }, clinicId);

  if (result.status === "failure") {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  if (result.status === "clinic_selection_required") {
    return NextResponse.json({ ok: true, clinicSelectionRequired: true, clinics: result.clinics });
  }

  if (result.status === "mfa_required") {
    return NextResponse.json({ ok: true, mfaRequired: true, challengeToken: result.challengeToken });
  }

  const response = NextResponse.json({ ok: true, mfaRequired: false, clinicId: result.session.clinicId });
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
