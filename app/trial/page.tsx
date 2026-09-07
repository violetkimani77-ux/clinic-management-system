import Link from "next/link";
import styles from "./page.module.css";

export default function TrialPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link href="/" className={styles.brand} aria-label="Heri CMS">
          <span className={styles.brandHeri}>Heri</span><span className={styles.brandCms}> CMS</span>
        </Link>
        <p className={styles.eyebrow}>Clinic Management System</p>
        <h1>Start Your 4-Day Free Trial</h1>
        <p className={styles.intro}>
          Create a secure clinic workspace and start evaluating Heri CMS without a credit card.
        </p>
        <form action="/api/trial" method="post" className={styles.form}>
          <label>Clinic name<input name="clinicName" required minLength={2} maxLength={120} /></label>
          <label>Administrator name<input name="administratorName" required minLength={2} maxLength={120} /></label>
          <label>Administrator email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
          <label>Password<input name="password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" /></label>
          <button type="submit">Create Trial Workspace</button>
        </form>
        <p className={styles.note}>Your password is securely hashed and is never displayed after signup.</p>
        <Link href="/login" className={styles.login}>Already have access? Sign in</Link>
      </section>
    </main>
  );
}
