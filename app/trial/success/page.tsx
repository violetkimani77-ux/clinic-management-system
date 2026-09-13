import Link from "next/link";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";

export default function TrialSuccessPage() {
  return (
    <main className={styles.page}>
      <nav aria-label="Public navigation" style={{ width: "100%", maxWidth: 1120, padding: "22px 28px 0" }}>
        <Link href="/" style={{ color: "inherit", textDecoration: "none", fontWeight: 800 }}>← Back to Heri CMS</Link>
      </nav>
      <section className={styles.card}>
        <Link href="/" className={styles.brand} aria-label="Heri CMS"><span className={styles.brandHeri}>Heri</span><span className={styles.brandCms}> CMS</span></Link>
        <p className={styles.eyebrow}>Trial workspace created</p>
        <h1>Your 14-day trial is ready.</h1>
        <p className={styles.intro}>Your clinic workspace and administrator account have been created. Sign in to continue setting up your team.</p>
        <p className={styles.note}>Next, you can invite up to two Pharmacy users and two Accounts & Billing users. You can also skip team setup and return to it later.</p>
        <Link href="/login?next=/setup" className={styles.login}>Sign in & Set Up Team →</Link>
      </section>
    </main>
  );
}
