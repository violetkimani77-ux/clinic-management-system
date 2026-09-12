import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getPlatformAuthContext } from "@/lib/platform/session";
import { PLATFORM_ACTIONS, requirePlatformAction } from "@/lib/platform/authorization";

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
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link href="/platform" className="text-sm text-cyan-300 hover:text-cyan-200">← Platform Control</Link>
        <header><p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Heri CMS</p><h1 className="mt-2 text-3xl font-semibold">Security &amp; Audit</h1><p className="mt-2 text-slate-300">Read-only privileged activity evidence. Audit entries are not editable from Platform Control.</p></header>
        <section className="overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="text-slate-400"><tr><th className="pb-3 pr-4">Time</th><th className="pb-3 pr-4">Actor</th><th className="pb-3 pr-4">Action</th><th className="pb-3 pr-4">Entity</th><th className="pb-3 pr-4">Target</th><th className="pb-3">Metadata</th></tr></thead>
            <tbody>{entries.map((entry) => <tr key={entry.id} className="border-t border-white/10 align-top"><td className="py-3 pr-4 whitespace-nowrap">{entry.createdAt.toISOString()}</td><td className="py-3 pr-4 font-mono text-xs">{entry.platformAdminId ?? "system"}</td><td className="py-3 pr-4 font-medium">{entry.action}</td><td className="py-3 pr-4">{entry.entityType}</td><td className="py-3 pr-4 font-mono text-xs">{entry.entityId ?? "—"}</td><td className="max-w-md py-3 font-mono text-xs text-slate-400">{entry.metadata ? JSON.stringify(entry.metadata) : "—"}</td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
