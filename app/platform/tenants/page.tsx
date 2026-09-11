import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPlatformAuthContext } from "@/lib/platform/session";
import { PLATFORM_ACTIONS, requirePlatformAction } from "@/lib/platform/authorization";

export const dynamic = "force-dynamic";

export default async function PlatformTenantsPage() {
  const auth = await getPlatformAuthContext();
  if (!auth) redirect("/platform/login");
  await requirePlatformAction(auth, PLATFORM_ACTIONS.VIEW_TENANTS);

  const clinics = await db.clinic.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      createdAt: true,
      tenantDataStore: { select: { status: true, isolationMode: true, residencyPolicy: true, country: true, backupCountry: true, lastHealthCheckAt: true } },
      subscriptions: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, currentPeriodEnd: true } },
    },
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <Link href="/platform" className="text-sm text-cyan-300 hover:text-cyan-200">← Platform Control</Link>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Heri CMS</p>
          <h1 className="mt-2 text-3xl font-semibold">Clinics / Tenants</h1>
          <p className="mt-2 text-slate-300">Operational tenant inventory without exposing clinical records.</p>
        </header>
        <section className="overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-slate-400"><tr><th className="pb-3 pr-4">Clinic</th><th className="pb-3 pr-4">Store</th><th className="pb-3 pr-4">Isolation</th><th className="pb-3 pr-4">Residency</th><th className="pb-3 pr-4">Backup</th><th className="pb-3 pr-4">Subscription</th><th className="pb-3">Detail</th></tr></thead>
            <tbody>
              {clinics.map((clinic) => {
                const store = clinic.tenantDataStore;
                const subscription = clinic.subscriptions[0];
                return <tr key={clinic.id} className="border-t border-white/10">
                  <td className="py-3 pr-4"><div className="font-medium">{clinic.name}</div><div className="text-xs text-slate-500">{clinic.code}</div></td>
                  <td className="py-3 pr-4">{store?.status ?? "—"}</td>
                  <td className="py-3 pr-4">{store?.isolationMode ?? "—"}</td>
                  <td className="py-3 pr-4">{store ? `${store.residencyPolicy} · ${store.country}` : "—"}</td>
                  <td className="py-3 pr-4">{store?.backupCountry ?? "—"}</td>
                  <td className="py-3 pr-4">{subscription?.status ?? "—"}</td>
                  <td className="py-3"><Link href={`/platform/tenants/${clinic.id}`} className="text-cyan-300 underline-offset-4 hover:underline">View operations</Link></td>
                </tr>;
              })}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
