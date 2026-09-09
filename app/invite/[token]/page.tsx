import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import InviteClient from "../invite-client";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const rows = await db.$queryRaw<{ email:string; name:string; clinicName:string; roleCode:string; expiresAt:Date; acceptedAt:Date|null }[]>`
    SELECT i."email", i."name", c."name" AS "clinicName", r."code"::text AS "roleCode", i."expiresAt", i."acceptedAt"
    FROM "ClinicInvitation" i JOIN "Clinic" c ON c."id" = i."clinicId" JOIN "Role" r ON r."id" = i."roleId"
    WHERE i."tokenHash" = ${tokenHash} LIMIT 1
  `;
  const invitation = rows[0];
  const valid = Boolean(invitation && !invitation.acceptedAt && invitation.expiresAt > new Date());
  return <InviteClient token={token} invitation={valid && invitation ? { name: invitation.name, email: invitation.email, clinicName: invitation.clinicName, roleCode: invitation.roleCode } : null} stylesClass={styles.card} />;
}
