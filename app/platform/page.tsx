import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function PlatformControlPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");

  // A clinic ADMIN is deliberately not platform authority. The dedicated
  // platform-admin identity/MFA/RBAC boundary is still being implemented.
  notFound();

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Heri CMS</p>
        <h1 className="mt-2 text-3xl font-semibold">Platform Control</h1>
        <p className="mt-3 text-slate-300">This privileged operations surface is not enabled for clinic sessions.</p>
        <Link className="mt-6 inline-flex rounded-xl border border-white/15 px-4 py-2 text-sm font-medium hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-300" href="/dashboard">
          Return to clinic workspace
        </Link>
      </div>
    </main>
  );
}
