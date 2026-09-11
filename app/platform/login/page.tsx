import { platformLoginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PlatformLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const failed = params.error === "invalid";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Heri CMS</p>
        <h1 className="mt-2 text-3xl font-semibold">Platform Control</h1>
        <p className="mt-3 text-slate-300">
          Privileged platform operations are isolated from clinic staff accounts.
        </p>

        {failed ? (
          <p className="mt-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200" role="alert">
            Sign-in failed. Check your platform credentials and authenticator code.
          </p>
        ) : null}

        <form action={platformLoginAction} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" required autoComplete="username" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-300" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" required autoComplete="current-password" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-300" />
          </label>
          <label className="block text-sm font-medium">
            Authenticator code
            <input name="mfaCode" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoComplete="one-time-code" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 tracking-[0.4em] text-white outline-none focus:ring-2 focus:ring-cyan-300" />
          </label>
          <button type="submit" className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-100">
            Sign in to Platform Control
          </button>
        </form>
      </section>
    </main>
  );
}
