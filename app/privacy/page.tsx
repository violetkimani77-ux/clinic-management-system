import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Privacy & Data Protection Policy",
  description: "Heri CMS Privacy & Data Protection Policy for clinic operations and health information processing.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
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
        <p className={styles.kicker}>LEGAL & DATA PROTECTION</p>
        <h1>Privacy & Data Protection Policy</h1>
        <p className={styles.updated}>Effective date: 7 September 2026 · Version 1.0</p>
        <p className={styles.lead}>
          This Privacy & Data Protection Policy explains how Heri CMS, operated by IHL Tech,
          handles personal information when you visit our website, create an account, use a
          clinic workspace, contact our team, or otherwise interact with our services.
        </p>
        <div className={styles.notice}>
          <strong>Important for clinics:</strong> Where a clinic uses Heri CMS to manage patient
          or other health information, the clinic will generally determine the purposes and means
          of that processing and may act as the data controller. Heri CMS may process that
          information on the clinic&apos;s instructions as a data processor, subject to the applicable
          agreement and Kenyan law.
        </div>

        <nav className={styles.contents} aria-label="Contents">
          <strong>Contents</strong>
          {[
            ["who-we-are", "1. Who we are"], ["scope", "2. Scope"], ["information", "3. Information we process"],
            ["purposes", "4. Why we process information"], ["lawful-bases", "5. Lawful bases"],
            ["clinic-responsibilities", "6. Clinics and patient information"], ["access", "7. Access, roles and confidentiality"],
            ["sharing", "8. Sharing and service providers"], ["transfers", "9. International transfers"],
            ["security", "10. Security"], ["retention", "11. Retention and deletion"], ["rights", "12. Data-subject rights"],
            ["breaches", "13. Security incidents and breaches"], ["children", "14. Children and minors"],
            ["cookies", "15. Cookies and analytics"], ["changes", "16. Changes to this policy"], ["contact", "17. Contact and complaints"],
          ].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>

        <Section id="who-we-are" title="1. Who we are"><p>Heri CMS is a clinic management platform operated by IHL Tech. We provide technology that helps clinics organise operational workflows, staff access, records, pharmacy processes, accounts and reporting.</p><p>For privacy questions, requests or concerns, contact us at <a href="mailto:invest@investit.click">invest@investit.click</a>.</p></Section>
        <Section id="scope" title="2. Scope"><p>This policy applies to the Heri CMS website, trial workspaces, clinic workspaces, account-management features and related services that link to this policy.</p><p>It should be read together with our Terms of Service and, where applicable, a Data Processing Addendum or other agreement with a clinic.</p></Section>
        <Section id="information" title="3. Information we process"><h3>Website and enquiry information</h3><p>We may process your name, email address, telephone number, clinic or organisation details, messages and information you provide when requesting a demo or contacting us.</p><h3>Account and workspace information</h3><p>We may process your name, email address, role, clinic membership, authentication information, account status, invitation records and workspace activity needed to operate the service.</p><h3>Clinic and health information</h3><p>A clinic may enter information about patients, clients, prescriptions, medicines, visits, payments, staff and other operational records into its Heri CMS workspace. Such information may include sensitive personal data, including health information. We process this information only as permitted by applicable law and, where Heri CMS acts as processor, according to the clinic&apos;s documented instructions.</p><h3>Technical and security information</h3><p>We may process IP addresses, device and browser information, authentication events, audit records, error information and other technical information necessary to secure and operate the service.</p></Section>
        <Section id="purposes" title="4. Why we process information"><ul><li>to create and administer clinic workspaces and user accounts;</li><li>to provide, maintain and improve Heri CMS;</li><li>to authenticate users and enforce role-based access;</li><li>to maintain audit and security records;</li><li>to respond to support, demo and trial requests;</li><li>to prevent fraud, misuse and unauthorised access;</li><li>to meet legal, regulatory and contractual obligations; and</li><li>to protect the rights, safety and security of our users, clinics and service.</li></ul></Section>
        <Section id="lawful-bases" title="5. Lawful bases"><p>Depending on the context, we may rely on consent, performance of a contract, compliance with a legal obligation, legitimate interests, or another lawful basis recognised by applicable Kenyan data-protection law.</p><p>Where a clinic is the controller of patient information, the clinic is responsible for identifying and documenting the appropriate lawful basis for its processing. Heri CMS does not treat use of the platform as a blanket substitute for a clinic&apos;s own patient-consent or legal requirements.</p></Section>
        <Section id="clinic-responsibilities" title="6. Clinics and patient information"><p>Clinics are responsible for determining why patient information is collected and how it is used, ensuring that collection and use are lawful, providing required notices, managing patient rights, and configuring user access appropriately.</p><p>Heri CMS is designed to support least-privilege access, individual staff accounts and accountable clinic workflows. Clinics should not share staff credentials and should promptly remove or change access when a staff member leaves or changes responsibilities.</p></Section>
        <Section id="access" title="7. Access, roles and confidentiality"><p>Access to clinic information is intended to be limited according to assigned roles and permissions. We maintain technical and organisational measures intended to protect information against unauthorised access, disclosure, alteration, loss or destruction.</p><p>Users are responsible for protecting their credentials and for using information only for authorised clinic purposes.</p></Section>
        <Section id="sharing" title="8. Sharing and service providers"><p>We do not sell personal information. We may disclose or permit access to information where necessary to provide the service, comply with law, protect the service, respond to a lawful request, or otherwise as permitted by the applicable agreement.</p><p>We may use carefully selected technology and service providers to support hosting, infrastructure, security, communications, monitoring, support and other service functions. Where they process personal information on our behalf, we seek to require appropriate confidentiality and data-protection obligations.</p></Section>
        <Section id="transfers" title="9. International transfers"><p>Some technology providers may process information outside Kenya. Where personal information is transferred outside Kenya, we will apply the safeguards required by applicable Kenyan data-protection law and the circumstances of the transfer.</p><p>We will not describe information as being stored exclusively in Kenya unless the underlying infrastructure and configuration actually support that statement.</p></Section>
        <Section id="security" title="10. Security"><p>We use reasonable technical and organisational safeguards appropriate to the nature and risk of the information we process. These may include access controls, authentication controls, encryption where appropriate, audit logging, secure development practices, backups, monitoring and security reviews.</p><p>No internet-based system can be guaranteed to be completely secure. We continuously work to identify and reduce security risks and expect clinics and users to maintain appropriate access and credential practices.</p></Section>
        <Section id="retention" title="11. Retention and deletion"><p>We retain personal information only for as long as reasonably necessary for the purposes for which it was collected, to provide the service, comply with legal or contractual obligations, resolve disputes, maintain security records and enforce agreements.</p><p>For clinic-controlled patient information, retention requirements may be determined by the clinic&apos;s legal and clinical obligations. On termination of a clinic relationship, data export, return and deletion will be handled according to the applicable agreement and legal requirements.</p></Section>
        <Section id="rights" title="12. Data-subject rights"><p>Subject to applicable law and any lawful limitations, data subjects may have rights including the right to be informed, access personal information, request correction, object to processing, request erasure where applicable, restrict processing and request portability.</p><p>Where Heri CMS processes information for a clinic as a processor, requests relating to patient information may need to be directed to the relevant clinic as controller. We will reasonably assist the clinic with lawful requests where required by our agreement and applicable law.</p></Section>
        <Section id="breaches" title="13. Security incidents and breaches"><p>We maintain processes for identifying, assessing and responding to security incidents. Where an incident involves personal information processed on behalf of a clinic, we will follow the incident-notification and cooperation requirements in the applicable agreement and law.</p></Section>
        <Section id="children" title="14. Children and minors"><p>Heri CMS is a professional clinic-management service and is not directed at children as direct users. Clinics may nevertheless process information about minors as part of lawful healthcare services. Clinics are responsible for meeting applicable requirements relating to minors, parental authority, consent and healthcare records.</p></Section>
        <Section id="cookies" title="15. Cookies and analytics"><p>We may use essential cookies and similar technologies required for authentication, security and service functionality. If we introduce non-essential analytics, advertising or similar technologies, we will provide appropriate information and choices where required.</p></Section>
        <Section id="changes" title="16. Changes to this policy"><p>We may update this policy when our services, legal obligations or data-processing practices change. We will publish the updated version with a new effective date. Material changes may be communicated through the service or another appropriate channel.</p></Section>
        <Section id="contact" title="17. Contact and complaints"><p>For privacy questions or requests, contact <a href="mailto:invest@investit.click">invest@investit.click</a>.</p><p>If you believe your personal information has been handled in a way that infringes your rights, you may also seek appropriate remedies under Kenyan law, including through the Office of the Data Protection Commissioner (ODPC).</p><p className={styles.disclaimer}>This policy is intended to describe Heri CMS&apos;s current privacy and data-protection approach. It is not legal advice and should be reviewed and approved by qualified Kenyan counsel before being treated as the company&apos;s final legal position.</p></Section>
      </article>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className={styles.section}><h2>{title}</h2>{children}</section>;
}
