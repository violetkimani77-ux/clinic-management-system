import { NextResponse } from "next/server";
import { authenticateStaff } from "@/lib/auth/login";
import { SESSION_COOKIE } from "@/lib/auth/session";

const SESSION_MAX_AGE = 60 * 60 * 8;

/** Creates a clinic-scoped session cookie after successful staff authentication. */
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

  const session = await authenticateStaff(body.email, body.password);
  if (!session) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    expires: session.expiresAt,
  });

  return response;
}
