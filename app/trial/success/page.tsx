import Link from "next/link";
import styles from "../page.module.css";

type SuccessPageProps = {
  searchParams: Promise<{ email?: string }>;
};

export default async function TrialSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const email = params.email;

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Link href="/" className={styles.brand}>Hali CMS</Link>
        <p className={styles.eyebrow}>Trial workspace created</p>
        <h1>Your 4-day trial is ready.</h1>
        <p className={styles.intro}>
          Your clinic workspace and administrator account have been created. Sign in to the CMS Portal using the administrator email and password you chose.
        </p>
        {email ? <p className={styles.note}>Administrator email: {email}</p> : null}
        <Link href="/login" className={styles.login}>Enter CMS Portal</Link>
      </section>
    </main>
  );
}
