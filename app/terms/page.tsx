import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Heri CMS Terms of Service for clinic management software, trials, accounts and authorised clinic use.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Heri CMS home">
          <span className={styles.heri}>Heri</span><span className={styles.cms}> CMS</span>
          <small>CLINIC MANAGEMENT SYSTEM</small>
        </Link>
        <Link href="/" className={styles.back}>Back to Heri CMS</Link>
      </header>
      <article className={styles.document}>
        <p className={styles.kicker}>LEGAL · TERMS OF SERVICE</p>
        <h1>Terms of Service</h1>
        <p className={styles.updated}>Effective date: 10 September 2026 · Version 1.0</p>
        <p className={styles.lead}>These Terms of Service govern access to and use of Heri CMS, a clinic management platform operated by IHL Tech. By creating a workspace, accepting an invitation, accessing a trial, or using the service on behalf of a clinic, you agree to these Terms.</p>
        <div className={styles.notice}><strong>Important:</strong> Heri CMS is software for clinic administration and operations. It is not a substitute for professional medical judgement, clinical governance, legal advice or a clinic&apos;s own obligations to patients and regulators.</div>
        <Section id="acceptance" title="1. Acceptance and eligibility"><p>You may use Heri CMS only if you have authority to enter into these Terms. If you are using the service for a clinic, you represent that you are authorised by that clinic to create or administer the workspace and bind the clinic to these Terms.</p></Section>
        <Section id="definitions" title="2. Definitions"><ul><li><strong>Heri CMS</strong> means the clinic management software and related services operated by IHL Tech.</li><li><strong>Clinic</strong> means the healthcare facility, organisation or business that creates or uses a workspace.</li><li><strong>Workspace</strong> means the clinic-specific environment created for authorised users.</li><li><strong>Authorised User</strong> means an individual permitted by a clinic to access its workspace.</li><li><strong>Clinic Data</strong> means information submitted to or generated within a clinic workspace.</li></ul></Section>
        <Section id="service" title="3. The service"><p>Heri CMS provides software intended to help clinics manage operational workflows, staff access, records, pharmacy processes, accounts and reporting. Features may change as we improve the service.</p><p>We do not provide medical diagnosis, treatment, prescribing, clinical decision-making or emergency care. Any clinical decision remains the responsibility of appropriately qualified healthcare professionals.</p></Section>
        <Section id="accounts" title="4. Accounts and authorised users"><p>Users must provide accurate account information and keep credentials confidential. Each person should use their own account; credentials must not be shared.</p><p>Clinic administrators are responsible for inviting authorised users, assigning appropriate roles, reviewing access and promptly removing access when it is no longer required.</p></Section>
        <Section id="workspace" title="5. Clinic workspace and roles"><p>The clinic controls its workspace and determines which people are authorised to access it. Role-based permissions are intended to support least-privilege access, but the clinic remains responsible for configuring and reviewing access appropriately.</p></Section>
        <Section id="customer-responsibilities" title="6. Clinic responsibilities"><p>The clinic is responsible for its use of Heri CMS and for ensuring that its use complies with applicable law, professional requirements and contractual obligations.</p><ul><li>maintain appropriate notices, consents and lawful bases for information processing;</li><li>ensure information entered into the service is accurate and appropriate;</li><li>maintain appropriate user access and credential practices; and</li><li>respond to patients, staff and regulators where the clinic has the relevant legal responsibility.</li></ul></Section>
        <Section id="patient-data" title="7. Patient and health information"><p>Health information is sensitive personal data under Kenyan data-protection law. Where a clinic determines the purposes and means of processing patient information, the clinic generally acts as the data controller and Heri CMS may act as a data processor.</p><p>The parties should use an applicable Data Processing Addendum or other written data-processing terms where required. Heri CMS will process Clinic Data according to the applicable agreement and documented instructions, subject to applicable law.</p></Section>
        <Section id="acceptable-use" title="8. Acceptable use"><p>You must not use Heri CMS to break the law, gain unauthorised access, upload malicious code, interfere with security controls, misrepresent your authority, or reverse engineer the service except where applicable law expressly permits it.</p></Section>
        <Section id="trial" title="9. Trial period"><p>Heri CMS may offer a fourteen-day trial for eligible clinics. The trial is provided for evaluation of the service and may be subject to feature, user or usage limits communicated during signup.</p></Section>
        <Section id="fees" title="10. Fees and billing"><p>If paid plans are introduced or selected, the applicable pricing, billing terms and commercial order or subscription terms will apply. We will not charge a clinic for a paid service unless the clinic has agreed to the applicable commercial terms.</p></Section>
        <Section id="third-parties" title="11. Third-party services"><p>Heri CMS may rely on third-party infrastructure and service providers for hosting, communications, security, monitoring, payments or other supporting functions. Third-party services that a clinic chooses to connect independently may be subject to their own terms and privacy policies.</p></Section>
        <Section id="security" title="12. Security and confidentiality"><p>We maintain reasonable technical and organisational safeguards designed to protect the service and Clinic Data against unauthorised access, alteration, disclosure, loss or destruction.</p></Section>
        <Section id="availability" title="13. Availability and changes"><p>We aim to keep Heri CMS available and reliable, but we do not guarantee uninterrupted or error-free operation. Service may be temporarily unavailable for maintenance, upgrades, security work, infrastructure failures or events outside our reasonable control.</p></Section>
        <Section id="support" title="14. Support and communications"><p>We may provide support through channels we make available from time to time. We may also send service-related communications such as security notices, account messages and maintenance notices.</p></Section>
        <Section id="suspension" title="15. Suspension and termination"><p>We may suspend or restrict access where reasonably necessary to address security risks, unlawful use, serious misuse, non-payment under applicable paid terms, or a material breach of these Terms.</p></Section>
        <Section id="data-export" title="16. Data export and deletion"><p>Where supported by the service and applicable agreement, clinics may export their Clinic Data during the relationship. On termination, return, export and deletion of Clinic Data will be handled according to applicable data-processing terms, legal requirements and reasonable technical capabilities.</p></Section>
        <Section id="ip" title="17. Intellectual property"><p>Heri CMS, including its software, interface, documentation, branding and underlying technology, is owned by or licensed to IHL Tech. Subject to these Terms, authorised clinics receive a limited, non-exclusive, non-transferable right to use the service for legitimate clinic operations.</p></Section>
        <Section id="disclaimers" title="18. Disclaimers"><p>To the extent permitted by law, Heri CMS is provided on an “as available” basis. It does not replace clinical judgement, professional supervision, statutory recordkeeping requirements or continuity arrangements required by the clinic&apos;s circumstances.</p></Section>
        <Section id="liability" title="19. Limitation of liability"><p>To the fullest extent permitted by applicable law, neither party will be liable for indirect, incidental, special or consequential losses arising from these Terms, except where such exclusion is not permitted by law. Nothing excludes liability that cannot lawfully be excluded or limited.</p></Section>
        <Section id="indemnity" title="20. Indemnity"><p>Where permitted by law, the clinic is responsible for claims arising from its unlawful use of the service, violation of these Terms, or failure to obtain required authority for information it submits, except to the extent caused by Heri CMS&apos;s own breach or misconduct.</p></Section>
        <Section id="changes" title="21. Changes to these Terms"><p>We may update these Terms as the service, business or applicable legal requirements change. Updated Terms will be published with a new effective date.</p></Section>
        <Section id="law" title="22. Governing law and disputes"><p>These Terms are intended to be governed by the laws of Kenya, subject to any mandatory legal protections that apply. The parties should first try to resolve disputes through good-faith discussion before using an appropriate forum with jurisdiction.</p></Section>
        <Section id="contact" title="23. Contact"><p>Questions about these Terms or the Heri CMS service can be directed to <a href="mailto:invest@investit.click">invest@investit.click</a>.</p><p>You can also review our <Link href="/privacy">Privacy &amp; Data Protection Policy</Link>.</p><p className={styles.disclaimer}>These Terms are intended as a practical draft for Heri CMS. They are not legal advice and should be reviewed and approved by qualified Kenyan counsel before being treated as the company&apos;s final legal position or incorporated into a paid customer agreement.</p></Section>
      </article>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className={styles.section}><h2>{title}</h2>{children}</section>;
}
