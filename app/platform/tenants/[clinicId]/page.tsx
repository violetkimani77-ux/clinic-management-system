import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPlatformAuthContext } from "@/lib/platform/session";
import { PLATFORM_ACTIONS, requirePlatformAction } from "@/lib/platform/authorization";
import { PlatformShell } from "@/components/platform/platform-shell";
import styles from "@/components/platform/platform-content.module.css";

export const dynamic = "force-dynamic";

export default async function PlatformTenantDetailPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const auth = await getPlatformAuthContext();
  if (!auth) redirect("/platform/login");
  await requirePlatformAction(auth, PLATFORM_ACTIONS.VIEW_TENANTS);

  const { clinicId } = await params;
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
      tenantDataStore: { select: { status: true, isolationMode: true, residencyPolicy: true, transferAssessmentStatus: true, transferAssessmentRef: true, country: true, backupCountry: true, provisionedAt: true, lastHealthCheckAt: true } },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, currentPeriodEnd: true, activatedAt: true } },
    },
  });
  if (!clinic) notFound();

  const store = clinic.tenantDataStore;
  const subscription = clinic.subscriptions[0];

  return (
    <PlatformShell context={auth} activeHref="/platform/tenants">
      <Link href="/platform/tenants" className={styles.backLink}>← Clinics / Tenants</Link>
      <div className={styles.pageHeader}>
        <p className={styles.eyebrow}>Heri CMS</p>
        <h1 className={styles.pageTitle}>{clinic.name}</h1>
        <p className={styles.pageSubtitle}>Tenant code: {clinic.code}</p>
      </div>

      <div className={styles.panel}>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}><p className={styles.infoLabel}>Store status</p><p className={styles.infoValue}>{store?.status ?? "—"}</p></div>
          <div className={styles.infoCard}><p className={styles.infoLabel}>Isolation mode</p><p className={styles.infoValue}>{store?.isolationMode ?? "—"}</p></div>
          <div className={styles.infoCard}><p className={styles.infoLabel}>Residency policy</p><p className={styles.infoValue}>{store?.residencyPolicy ?? "—"}</p></div>
          <div className={styles.infoCard}><p className={styles.infoLabel}>Primary country</p><p className={styles.infoValue}>{store?.country ?? "—"}</p></div>
          <div className={styles.infoCard}><p className={styles.infoLabel}>Backup country</p><p className={styles.infoValue}>{store?.backupCountry ?? "—"}</p></div>
          <div className={styles.infoCard}><p className={styles.infoLabel}>Transfer assessment</p><p className={styles.infoValue}>{store?.transferAssessmentStatus ?? "—"}</p></div>
          <div className={styles.infoCard}><p className={styles.infoLabel}>Provisioned</p><p className={styles.infoValue}>{store?.provisionedAt?.toISOString() ?? "—"}</p></div>
          <div className={styles.infoCard}><p className={styles.infoLabel}>Last health check</p><p className={styles.infoValue}>{store?.lastHealthCheckAt?.toISOString() ?? "—"}</p></div>
          <div className={styles.infoCard}><p className={styles.infoLabel}>Subscription</p><p className={styles.infoValue}>{subscription?.status ?? "—"}</p></div>
          <div className={styles.infoCard}><p className={styles.infoLabel}>Subscription period end</p><p className={styles.infoValue}>{subscription?.currentPeriodEnd.toISOString() ?? "—"}</p></div>
        </div>
      </div>

      <div className={styles.alertBanner}>
        Platform Control exposes tenant infrastructure and entitlement metadata only. Clinical patient, visit, prescription,
        dispensing and billing records remain outside this operational surface.
      </div>
    </PlatformShell>
  );
}
