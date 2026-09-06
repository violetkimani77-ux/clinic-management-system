import Link from "next/link";
import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Hali CMS | Clinic Management System",
  description:
    "Hali CMS is a secure clinic management system for patient care, visits, pharmacy, accounts and reporting.",
};

const modules = [
  {
    title: "Patient care",
    text: "Keep patient records, visits and clinical workflows organized in one staff workspace.",
  },
  {
    title: "Pharmacy",
    text: "Track medicines, inventory and pharmacy activity with role-aware access and operational visibility.",
  },
  {
    title: "Accounts & reports",
    text: "Bring collections, outstanding balances and operational reporting into a controlled workflow.",
  },
];

const securityItems = [
  {
    benefit: "Protect sensitive clinic information",
    feature: "Multi-factor authentication",
    detail: "Add a stronger verification layer for staff accessing protected clinic data.",
  },
  {
    benefit: "Give every staff member the right access",
    feature: "Role-based permissions",
    detail: "Control what clinical and operational teams can see and do according to their responsibilities.",
  },
  {
    benefit: "Keep each clinic's information properly separated",
    feature: "Multi-clinic tenant isolation",
    detail: "Use clinic-aware sessions and data boundaries to support secure multi-clinic operations.",
  },
  {
    benefit: "Keep data where your clinic expects it",
    feature: "Kenya-first data residency",
    detail: "Build around Kenya-based data storage with controlled cross-border processing when approved and required safeguards are in place.",
  },
];

export default function HomePage() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Public navigation">
        <Link href="/" className={styles.brand} aria-label="Hali CMS — Clinic Management System">
          <span className={styles.brandName}>Hali CMS</span>
          <span className={styles.brandSubtitle}>CLINIC MANAGEMENT SYSTEM</span>
        </Link>
        <div className={styles.navActions}>
          <Link href="#capabilities" className={styles.navLink}>Capabilities</Link>
          <Link href="#security" className={styles.navLink}>Security</Link>
          <Link href="#trial" className={styles.navLink}>Free trial</Link>
          <Link href="/login" className={styles.primaryButton}>CMS Portal Sign in</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Hali CMS · Clinic Management System</p>
          <h1 className={styles.heroTitle}>One secure platform for your clinic operations</h1>
          <p className={styles.heroText}>
            A focused management platform for clinics that need dependable patient,
            visit, pharmacy, accounts and reporting workflows without sacrificing
            security or operational control.
          </p>
          <div className={styles.heroActions}>
            <Link href="#trial" className={styles.primaryButton}>Start Your 4-Day Free Trial</Link>
            <Link href="/login" className={styles.secondaryButton}>Enter CMS Portal</Link>
          </div>
        </div>

        <div className={styles.heroPanel} aria-label="Platform overview">
          <div className={styles.panelHeader}>
            <span className={styles.panelLabel}>Clinic workspace</span>
            <span className={styles.status}><span className={styles.statusDot} aria-hidden="true" />Secure access</span>
          </div>
          <div className={styles.metricGrid}>
            <div className={styles.metric}><span className={styles.metricValue}>Patients</span><span className={styles.metricLabel}>Centralized records</span></div>
            <div className={styles.metric}><span className={styles.metricValue}>Visits</span><span className={styles.metricLabel}>Daily care workflow</span></div>
            <div className={styles.metric}><span className={styles.metricValue}>Pharmacy</span><span className={styles.metricLabel}>Inventory visibility</span></div>
            <div className={styles.metric}><span className={styles.metricValue}>Accounts</span><span className={styles.metricLabel}>Financial operations</span></div>
          </div>
          <p className={styles.panelNote}>Designed around clear roles, controlled access and clinic-level data boundaries.</p>
        </div>
      </section>

      <section id="capabilities" className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionIntro}>
            <p className={styles.sectionKicker}>Built for the whole clinic</p>
            <h2 className={styles.sectionTitle}>Better Clinic Management</h2>
            <p className={styles.sectionText}>Connect patient care, visits, pharmacy, accounts and reporting in one secure platform, so your team spends less time chasing information and more time caring for patients and running the clinic.</p>
          </div>
          <div className={styles.cards}>
            {modules.map((module) => (
              <article key={module.title} className={styles.card}>
                <div className={styles.cardAccent} aria-hidden="true" />
                <h3 className={styles.cardTitle}>{module.title}</h3>
                <p className={styles.cardText}>{module.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className={`${styles.section} ${styles.security}`}>
        <div className={styles.sectionInner}>
          <div>
            <p className={styles.sectionKicker}>Security by design</p>
            <h2 className={styles.sectionTitle}>Protection that helps your clinic stay secure, controlled and accountable.</h2>
            <p className={styles.sectionText}>Hali CMS combines practical security controls with clinic operations, helping protect sensitive information while making access easier to manage as your team grows.</p>
          </div>
          <div className={styles.securityList}>
            {securityItems.map((item, index) => (
              <div key={item.feature} className={styles.securityItem}>
                <span aria-hidden="true">0{index + 1}</span>
                <div>
                  <strong>{item.benefit}</strong>
                  <h3>{item.feature}</h3>
                  <p>{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="trial" className={`${styles.section} ${styles.cta}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionIntro}>
            <p className={styles.sectionKicker}>Evaluate it in your own workflow</p>
            <h2 className={styles.sectionTitle}>Start Your 4-Day Free Trial.</h2>
            <p className={styles.sectionText}>
              We can provision a dedicated trial workspace for your clinic so your team can evaluate the core workflows, roles, security controls and reporting before making a commitment.
            </p>
            <p className={styles.sectionText}>No credit card is required for the trial.</p>
          </div>
          <div className={styles.heroActions}>
            <Link href="/login" className={styles.primaryButton}>Talk to our Team</Link>
            <Link href="/login" className={styles.secondaryButton}>Existing staff sign in</Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}><span>Hali CMS · Clinic Management System</span><span>POWERED BY IHL TECH</span></div>
      </footer>
    </main>
  );
}
