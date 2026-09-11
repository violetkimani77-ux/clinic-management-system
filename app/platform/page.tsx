import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function PlatformControlPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  // The current clinic RBAC model is intentionally not treated as platform authority.
  // Keep this surface read-only until a dedicated platform-admin identity and MFA/RBAC model exists.
  if (auth.roleCode !== "ADMIN") redirect("/dashboard");

  const [clinicCount, trialCount, subscriptionCounts, datastoreCounts] = await Promise.all([
    db.clinic.count(),
    db.clinicSubscription.count({ where: { status: "TRIAL" } }),
    db.clinicSubscription.groupBy({ by: ["status"], _count: { _all: true } }),
    db.tenantDataStore.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const subscriptions = Object.fromEntries(
    subscriptionCounts.map((item) => [item.status, item._count._all]),
  );
  const datastores = Object.fromEntries(
    datastoreCounts.map((item) => [item.status, item._count._all]),
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Heri CMS</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Platform Control</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Read-only platform operations overview. Clinic clinical records are intentionally excluded.
            </p>
          </div>
          <Link className="rounded-xl border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300" href="/dashboard">
            Return to clinic workspace
          </Link>
        </header>

        <section aria-labelledby="overview-heading">
          <h2 id="overview-heading" className="mb-4 text-lg font-semibold">Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Clinics / tenants" value={clinicCount} />
            <Metric label="Trials" value={trialCount} />
            <Metric label="Active subscriptions" value={subscriptions.ACTIVE ?? 0} />
            <Metric label="Healthy datastores" value={datastores.HEALTHY ?? 0} />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2" aria-label="Platform operations">
          <Panel title="Subscriptions">
            <StatusRow label="Trial" value={subscriptions.TRIAL ?? 0} />
            <StatusRow label="Active" value={subscriptions.ACTIVE ?? 0} />
            <StatusRow label="Past due" value={subscriptions.PAST_DUE ?? 0} />
            <StatusRow label="Canceled" value={subscriptions.CANCELED ?? 0} />
            <StatusRow label="Expired" value={subscriptions.EXPIRED ?? 0} />
          </Panel>
          <Panel title="Datastore health">
            <StatusRow label="Healthy" value={datastores.HEALTHY ?? 0} />
            <StatusRow label="Provisioning" value={datastores.PROVISIONING ?? 0} />
            <StatusRow label="Migrating" value={datastores.MIGRATING ?? 0} />
            <StatusRow label="Degraded" value={datastores.DEGRADED ?? 0} />
            <StatusRow label="Failed" value={datastores.FAILED ?? 0} />
          </Panel>
        </section>

        <section className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.06] p-6" aria-labelledby="boundary-heading">
          <h2 id="boundary-heading" className="font-semibold text-amber-100">Privileged boundary</h2>
          <p className="mt-2 text-sm leading-6 text-amber-50/80">
            This first slice is deliberately read-only. A clinic ADMIN session is not a platform-admin identity. Provisioning, suspension, migration, residency changes, break-glass access and other high-risk actions remain unavailable until dedicated platform authentication, MFA, least-privilege RBAC, step-up authentication and audit controls are implemented.
          </p>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="divide-y divide-white/10">{children}</div>
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-3 text-sm">
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
