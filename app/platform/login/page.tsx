import { platformLoginAction } from "./actions";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function PlatformLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const failed = params.error === "invalid";

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Heri CMS</p>
        <h1 className={styles.title}>Platform Control</h1>
        <p className={styles.subtitle}>
          Privileged platform operations are isolated from clinic staff accounts.
        </p>

        {failed ? (
          <p role="alert" className={styles.errorBanner}>
            Sign-in failed. Check your platform credentials and authenticator code.
          </p>
        ) : null}

        <form action={platformLoginAction} className={styles.form}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <input name="email" type="email" required autoComplete="username" className={styles.input} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Password</span>
            <input name="password" type="password" required autoComplete="current-password" className={styles.input} />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Authenticator code</span>
            <input
              name="mfaCode"
              inputMode="numeric"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              autoComplete="one-time-code"
              className={styles.inputCode}
            />
          </label>
          <button type="submit" className={styles.submit}>
            Sign in to Platform Control
          </button>
        </form>
      </section>
    </main>
  );
}
