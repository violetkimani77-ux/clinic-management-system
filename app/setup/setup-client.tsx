"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type Role = "PHARMACY" | "ACCOUNTS";
type Counts = { PHARMACY: number; ACCOUNTS: number };
type Invite = { name: string; email: string; role: Role; url: string; expiresAt: string };

const roleCopy = {
  PHARMACY: { label: "Pharmacy", description: "Manage pharmacy workflows, dispensing and stock." },
  ACCOUNTS: { label: "Accounts & Billing", description: "Manage invoices, payments, balances and accounts." },
};

export default function SetupClient() {
  const [clinic, setClinic] = useState("");
  const [counts, setCounts] = useState<Counts>({ PHARMACY: 0, ACCOUNTS: 0 });
  const [role, setRole] = useState<Role>("PHARMACY");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/team/invite", { cache: "no-store" });
    if (!response.ok) { setError("We couldn't load your team setup. Please sign in again."); setLoading(false); return; }
    const data = await response.json();
    setClinic(data.clinic);
    setCounts(data.counts);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setInvite(null); setSaving(true);
    try {
      const response = await fetch("/api/team/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, role }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "We couldn't create the invitation."); return; }
      setInvite(data.invitation); setName(""); setEmail(""); await load();
    } catch { setError("We couldn't reach the team setup service. Please try again."); }
    finally { setSaving(false); }
  }

  if (loading) return <main className={styles.page}><div className={styles.shell}><p className={styles.kicker}>Heri CMS · Workspace setup</p><h1>Preparing your clinic team.</h1></div></main>;

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.top}><a href="/dashboard" className={styles.back}>← Back to workspace</a><span className={styles.badge}>Standard team setup</span></div>
        <section className={styles.hero}>
          <p className={styles.kicker}>Heri CMS · Workspace setup</p>
          <h1>Build your clinic team.</h1>
          <p className={styles.lead}>Set up the people who will help you evaluate Heri CMS. Your administrator account is already active.</p>
          <div className={styles.workspace}><span>Clinic workspace</span><strong>{clinic}</strong><small>1 Administrator · up to 2 Pharmacy · up to 2 Accounts & Billing</small></div>
        </section>

        <section className={styles.grid}>
          {(Object.keys(roleCopy) as Role[]).map((item) => (
            <button key={item} type="button" className={`${styles.roleCard} ${role === item ? styles.selected : ""}`} onClick={() => setRole(item)} disabled={counts[item] >= 2}>
              <div><span className={styles.roleName}>{roleCopy[item].label}</span><p>{roleCopy[item].description}</p></div>
              <span className={styles.count}>{counts[item]} / 2</span>
            </button>
          ))}
        </section>

        <section className={styles.panel}>
          <div><p className={styles.kicker}>Invite a colleague</p><h2>{roleCopy[role].label}</h2><p className={styles.muted}>Create a secure invitation link for a named team member. Invitations expire after 7 days.</p></div>
          <form onSubmit={submit} className={styles.form}>
            <label>Full name<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={120} /></label>
            <label>Email address<input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" maxLength={254} autoComplete="email" /></label>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
            <button type="submit" disabled={saving || counts[role] >= 2}>{saving ? "Creating invitation…" : `Add ${roleCopy[role].label}`}</button>
          </form>
          {invite ? <div className={styles.invite} role="status"><strong>Invitation ready</strong><span>{invite.name} · {roleCopy[invite.role].label}</span><input readOnly value={invite.url} onFocus={(e) => e.currentTarget.select()} aria-label="Invitation link"/><p>Copy this link and send it to your colleague. The link expires in 7 days.</p></div> : null}
        </section>

        <div className={styles.footer}><p><strong>Need more than two users in a role?</strong> The standard workspace supports up to two Pharmacy users and two Accounts & Billing users. Larger or custom team structures can be configured with Heri.</p><a href="mailto:invest@investit.click">Contact Heri</a></div>
      </div>
    </main>
  );
}
