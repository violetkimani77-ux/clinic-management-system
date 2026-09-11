import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPlatformAuthContext } from "@/lib/platform/session";
import { PLATFORM_ACTIONS, requirePlatformAction } from "@/lib/platform/authorization";

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

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/platform/tenants" className="text-sm text-cyan-300 hover:text-cyan-200">← Clinics / Tenants</Link>
        <header className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Heri CMS</p>
          <h1 className="mt-2 text-3xl font-semibold">{clinic.name}</h1>
          <p className="mt-2 text-slate-400">Tenant code: {clinic.code}</p>
        </header>
        <section className="grid gap-4 sm:grid-cols-2">
          <Info label="Store status" value={clinic.tenantDataStore?.status ?? "—"} />
          <Info label="Isolation mode" value={clinic.tenantDataStore?.isolationMode ?? "—"} />
          <Info label="Residency policy" value={clinic.tenantDataStore?.residencyPolicy ?? "—"} />
          <Info label="Primary country" value={clinic.tenantDataStore?.country ?? "—"} />
          <Info label="Backup country" value={clinic.tenantDataStore?.backupCountry ?? "—"} />
          <Info label="Transfer assessment" value={clinic.tenantDataStore?.transferAssessmentStatus ?? "—"} />
          <Info label="Provisioned" value={clinic.tenantDataStore?.provisionedAt?.toISOString() ?? "—"} />
          <Info label="Last health check" value={clinic.tenantDataStore?.lastHealthCheckAt?.toISOString() ?? "—"} />
          <Info label="Subscription" value={clinic.subscriptions[0]?.status ?? "—"} />
          <Info label="Subscription period end" value={clinic.subscriptions[0]?.currentPeriodEnd.toISOString() ?? "—"} />
        </section>
        <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-4 text-sm text-slate-300">
          Platform Control exposes tenant infrastructure and entitlement metadata only. Clinical patient, visit, prescription, dispensing and billing records remain outside this operational surface.
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 font-medium">{value}</p></div>;
}
