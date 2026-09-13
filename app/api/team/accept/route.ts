import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";

const SESSION_MAX_AGE = 60 * 60 * 8;
function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token || password.length < 12 || password.length > 128) return NextResponse.json({ error: "Use a password between 12 and 128 characters." }, { status: 400 });

  const invitations = await db.$queryRaw<{ id:string; clinicId:string; email:string; name:string; roleId:string; roleCode:string; expiresAt:Date; acceptedAt:Date|null }[]>`
    SELECT i."id", i."clinicId", i."email", i."name", i."roleId", r."code"::text AS "roleCode", i."expiresAt", i."acceptedAt"
    FROM "ClinicInvitation" i JOIN "Role" r ON r."id" = i."roleId"
    WHERE i."tokenHash" = ${hashToken(token)} LIMIT 1
  `;
  const invitation = invitations[0];
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return NextResponse.json({ error: "This invitation is no longer valid." }, { status: 410 });

  const result = await db.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({ where: { email: invitation.email } });
    let userId: string;
    if (existing) {
      if (existing.status !== "ACTIVE" || !(await verifyPassword(password, existing.passwordHash))) throw new Error("INVALID_CREDENTIALS");
      userId = existing.id;
    } else {
      const created = await tx.user.create({ data: { email: invitation.email, name: invitation.name, passwordHash: await hashPassword(password), status: "ACTIVE" } });
      userId = created.id;
    }
    const existingMembership = await tx.membership.findUnique({ where: { clinicId_userId: { clinicId: invitation.clinicId, userId } } });
    if (!existingMembership) await tx.membership.create({ data: { clinicId: invitation.clinicId, userId, roleId: invitation.roleId } });
    await tx.$executeRaw`UPDATE "ClinicInvitation" SET "acceptedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = ${invitation.id}`;
    return createSession(userId, invitation.clinicId, tx);
  }).catch((error) => {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") return null;
    throw error;
  });

  if (!result) return NextResponse.json({ error: "That email already has an account. Enter its existing password to join this workspace." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, result.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE, expires: result.expiresAt });
  return response;
}
