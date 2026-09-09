import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { getAuthContext } from "@/lib/auth/session";
import { requirePermission } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";

const MAX_BY_ROLE = { PHARMACY: 2, ACCOUNTS: 2 } as const;
type TeamRole = keyof typeof MAX_BY_ROLE;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function requireAdmin() {
  const auth = await getAuthContext();
  if (!auth) throw new Error("AUTH_REQUIRED");
  requirePermission(auth, PERMISSIONS.USERS_MANAGE);
  if (auth.roleCode !== "ADMIN") throw new Error("ADMIN_REQUIRED");
  return auth;
}

async function teamCounts(clinicId: string) {
  const rows = await db.$queryRaw<{ role: string; count: bigint }[]>`
    SELECT r."code"::text AS role, COUNT(*)::bigint AS count
    FROM "Membership" m JOIN "Role" r ON r."id" = m."roleId"
    WHERE m."clinicId" = ${clinicId} AND r."code" IN ('PHARMACY','ACCOUNTS')
    GROUP BY r."code"
  `;
  const pending = await db.$queryRaw<{ role: string; count: bigint }[]>`
    SELECT r."code"::text AS role, COUNT(*)::bigint AS count
    FROM "ClinicInvitation" i JOIN "Role" r ON r."id" = i."roleId"
    WHERE i."clinicId" = ${clinicId} AND i."acceptedAt" IS NULL AND i."expiresAt" > NOW() AND r."code" IN ('PHARMACY','ACCOUNTS')
    GROUP BY r."code"
  `;
  return {
    PHARMACY: Number(rows.find((row) => row.role === "PHARMACY")?.count ?? 0n) + Number(pending.find((row) => row.role === "PHARMACY")?.count ?? 0n),
    ACCOUNTS: Number(rows.find((row) => row.role === "ACCOUNTS")?.count ?? 0n) + Number(pending.find((row) => row.role === "ACCOUNTS")?.count ?? 0n),
  };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    const clinic = await db.clinic.findUnique({ where: { id: auth.clinicId }, select: { name: true } });
    if (!clinic) return NextResponse.json({ error: "Clinic workspace not found." }, { status: 404 });
    return NextResponse.json({ clinic: clinic.name, counts: await teamCounts(auth.clinicId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    return NextResponse.json({ error: message === "AUTH_REQUIRED" ? "Authentication required." : "You do not have permission to manage this team." }, { status: message === "AUTH_REQUIRED" ? 401 : 403 });
  }
}

export async function POST(request: Request) {
  let auth;
  try { auth = await requireAdmin(); } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    return NextResponse.json({ error: message === "AUTH_REQUIRED" ? "Authentication required." : "You do not have permission to manage this team." }, { status: message === "AUTH_REQUIRED" ? 401 : 403 });
  }

  let body: { name?: unknown; email?: unknown; role?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role: TeamRole | null = body.role === "PHARMACY" || body.role === "ACCOUNTS" ? body.role : null;
  if (name.length < 2 || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || !role) return NextResponse.json({ error: "Enter a valid name, email and supported role." }, { status: 400 });

  const roleRow = await db.role.findUnique({ where: { code: role } });
  if (!roleRow) return NextResponse.json({ error: "This role is not configured." }, { status: 500 });
  const counts = await teamCounts(auth.clinicId);
  if (counts[role] >= MAX_BY_ROLE[role]) return NextResponse.json({ error: `${role === "PHARMACY" ? "Pharmacy" : "Accounts & Billing"} already has the maximum of ${MAX_BY_ROLE[role]} standard users.` }, { status: 409 });

  const existingUser = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) {
    const membership = await db.membership.findUnique({ where: { clinicId_userId: { clinicId: auth.clinicId, userId: existingUser.id } }, select: { id: true } });
    if (membership) return NextResponse.json({ error: "That email already belongs to this clinic workspace." }, { status: 409 });
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const id = randomBytes(16).toString("hex");
  await db.$executeRaw`
    INSERT INTO "ClinicInvitation" ("id", "clinicId", "email", "name", "roleId", "tokenHash", "expiresAt", "createdAt", "updatedAt")
    VALUES (${id}, ${auth.clinicId}, ${email}, ${name}, ${roleRow.id}, ${hashToken(token)}, ${expiresAt}, NOW(), NOW())
  `;

  const origin = new URL(request.url).origin;
  return NextResponse.json({ ok: true, invitation: { name, email, role, expiresAt, url: `${origin}/invite/${token}` } });
}
