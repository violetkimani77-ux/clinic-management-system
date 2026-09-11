import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPlatformAuthContext } from "@/lib/platform/session";
import { clearPlatformSession } from "@/lib/platform/session";

export const dynamic = "force-dynamic";

export default async function PlatformControlPage() {
  const auth = await getPlatformAuthContext();
  if (!auth) redirect("/platform/login");

  const [clinicCount, stores, subscriptions, recentAudit] = await Promise.all([
    db.clinic.count(),
    db.tenantDataStore.groupBy({ by: ["status"], _count: { _all: true } }),
    db.clinicSubscription.groupBy({ by: ["status"], _count: { _all: true } }),
    db.platformAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, action: true, entityType: true, entityId: true, createdAt: true },
    }),
  ]);

  const storeSummary = Object.fromEntries(stores.map((item) => [item.status, item._count._all]));
  const subscriptionSummary = Object.fromEntries(subscriptions.map((item) => [item.status, item._count._all]));

  async function logout() {
    "use server";
    await clearPlatformSession();
    redirect("/platform/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Heri CMS</p>
            <h1 className="mt-2 text-3xl font-semibold">Platform Control</h1>
            <p className="mt-2 text-slate-300">Privileged, read-only operational overview for {auth.name}.</p>
          </div>
          <form action={logout}>
            <button type="submit" className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300">Sign out</button>
          </form>
        </header>

        <section aria-label="Platform overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Clinics / tenants" value={clinicCount} />
          <Metric label="Healthy data stores" value={storeSummary.HEALTHY ?? 0} />
          <Metric label="Degraded stores" value={storeSummary.DEGRADED ?? 0} />
          <Metric label="Failed stores" value={storeSummary.FAILED ?? 0} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Tenant data stores">
            <SummaryRow label="Setup" value={storeSummary.SETUP ?? 0} />
            <SummaryRow label="Provisioning" value={storeSummary.PROVISIONING ?? 0} />
            <SummaryRow label="Migrating" value={storeSummary.MIGRATING ?? 0} />
            <SummaryRow label="Healthy" value={storeSummary.HEALTHY ?? 0} />
            <SummaryRow label="Degraded" value={storeSummary.DEGRADED ?? 0} />
            <SummaryRow label="Failed" value={storeSummary.FAILED ?? 0} />
          </Panel>

          <Panel title="Subscriptions">
            <SummaryRow label="Trial" value={subscriptionSummary.TRIAL ?? 0} />
            <SummaryRow label="Active" value={subscriptionSummary.ACTIVE ?? 0} />
            <SummaryRow label="Past due" value={subscriptionSummary.PAST_DUE ?? 0} />
            <SummaryRow label="Canceled" value={subscriptionSummary.CANCELED ?? 0} />
            <SummaryRow label="Expired" value={subscriptionSummary.EXPIRED ?? 0} />
          </Panel>
        </section>

        <Panel title="Privileged audit trail">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-400">
                <tr><th className="pb-3 pr-4">Time</th><th className="pb-3 pr-4">Action</th><th className="pb-3 pr-4">Entity</th><th className="pb-3">ID</th></tr>
              </thead>
              <tbody>
                {recentAudit.map((entry) => (
                  <tr key={entry.id} className="border-t border-white/10">
                    <td className="py-3 pr-4 whitespace-nowrap">{entry.createdAt.toISOString()}</td>
                    <td className="py-3 pr-4 font-medium">{entry.action}</td>
                    <td className="py-3 pr-4">{entry.entityType}</td>
                    <td className="py-3 font-mono text-xs text-slate-400">{entry.entityId ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div>;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"><h2 className="text-lg font-semibold">{title}</h2><div className="mt-5">{children}</div></section>;
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between border-b border-white/10 py-3 last:border-0"><span className="text-slate-300">{label}</span><span className="font-semibold">{value}</span></div>;
}
