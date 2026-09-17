import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPlatformAuthContext } from "@/lib/platform/session";
import { PLATFORM_ACTIONS, requirePlatformAction } from "@/lib/platform/authorization";
import { PlatformShell } from "@/components/platform/platform-shell";
import styles from "@/components/platform/platform-content.module.css";

export const dynamic = "force-dynamic";

export default async function PlatformAuditPage() {
  const auth = await getPlatformAuthContext();
  if (!auth) redirect("/platform/login");
  await requirePlatformAction(auth, PLATFORM_ACTIONS.VIEW_AUDIT);

  const entries = await db.platformAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, platformAdminId: true, action: true, entityType: true, entityId: true, metadata: true, ipAddress: true, userAgent: true, createdAt: true },
  });

  return (
    <PlatformShell context={auth} activeHref="/platform/audit">
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>Heri CMS</p>
        <h1 className={styles.pageTitle}>Security &amp; Audit</h1>
        <p className={styles.pageSubtitle}>Read-only privileged activity evidence. Audit entries are not editable from Platform Control.</p>
      </div>

      <div className={styles.panel}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Target</th><th>Metadata</th></tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className={styles.tableMono}>{entry.createdAt.toISOString()}</td>
                  <td className={styles.tableMono}>{entry.platformAdminId ?? "system"}</td>
                  <td className={styles.tableClinicName}>{entry.action}</td>
                  <td>{entry.entityType}</td>
                  <td className={styles.tableMono}>{entry.entityId ?? "—"}</td>
                  <td className={styles.tableMono}>{entry.metadata ? JSON.stringify(entry.metadata) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PlatformShell>
  );
}
