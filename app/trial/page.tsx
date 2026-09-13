import type { Metadata } from "next";
import Link from "next/link";
import { Manrope } from "next/font/google";
import styles from "./page.module.css";
import TrialForm from "./trial-form";

export const metadata: Metadata = {
  title: "Start Your 14-Day Free Trial",
  description: "Create a secure clinic workspace and evaluate Heri CMS for patient care, visits, pharmacy, accounts and reporting workflows.",
  alternates: { canonical: "/trial" },
};

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-trial", weight: ["400", "500", "600", "700", "800"] });

export default function TrialPage() {
  return (
    <main className={`${styles.page} ${manrope.variable}`}>
      <nav className={styles.nav} aria-label="Trial navigation">
        <Link href="/" className={styles.brand} aria-label="Heri CMS — Clinic Management System">
          <span className={styles.brandName}><span className={styles.brandHeri}>Heri</span><span className={styles.brandCms}> CMS</span></span>
          <span className={styles.brandSubtitle}>CLINIC MANAGEMENT SYSTEM</span>
        </Link>
        <Link href="/" className={styles.dashboardLink}>Back to Heri CMS</Link>
      </nav>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Heri CMS · Free trial</p>
          <h1>Start your 14-day free trial.</h1>
          <p className={styles.intro}>Create a secure clinic workspace and start evaluating Heri CMS today</p>
          <div className={styles.trustRow} aria-label="Trial benefits"><span><b aria-hidden="true">✓</b> No credit card</span><span><b aria-hidden="true">✓</b> Secure workspace</span><span><b aria-hidden="true">✓</b> Setup in minutes</span></div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}><div><p className={styles.cardKicker}>Create your workspace</p><h2>Clinic details</h2></div><span className={styles.step}>01</span></div>
          <TrialForm />
          <p className={styles.note}>Your password is securely hashed and is never displayed after signup.</p>
          <Link href="/login" className={styles.login}>Already have access? Sign in →</Link>
        </div>
      </section>
    </main>
  );
}
