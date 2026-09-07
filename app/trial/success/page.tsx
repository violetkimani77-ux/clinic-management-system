import Link from "next/link";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default function TrialSuccessPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link href="/" className={styles.brand}>Heri CMS</Link>
        <p className={styles.eyebrow}>Trial workspace created</p>
        <h1>Your 4-day trial is ready.</h1>
        <p className={styles.intro}>
          Your clinic workspace and administrator account have been created. Sign in to the CMS Portal using the administrator email and password you chose.
        </p>
        <p className={styles.note}>Use the administrator email you entered during signup to sign in.</p>
        <Link href="/login" className={styles.login}>Enter CMS Portal</Link>
      </section>
    </main>
  );
}
