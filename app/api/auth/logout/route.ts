import { NextResponse } from "next/server";
import { clearSession, SESSION_COOKIE } from "@/lib/auth/session";

/** Revokes the current server session and clears its browser cookie. */
export async function POST() {
  await clearSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
