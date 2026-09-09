"use client";

import { useState } from "react";

type Props = { token: string; invitation: { name:string; email:string; clinicName:string; roleCode:string } | null; stylesClass: string };

export default function InviteClient({ token, invitation, stylesClass }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const role = invitation?.roleCode === "PHARMACY" ? "Pharmacy" : "Accounts & Billing";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    try {
      const response = await fetch("/api/team/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "We couldn't accept this invitation."); return; }
      window.location.assign("/dashboard");
    } catch { setError("We couldn't reach Heri CMS. Please try again."); }
    finally { setPending(false); }
  }

  return <main className={stylesClass} style={{ maxWidth: 560, margin: "80px auto", padding: 36 }}>
    {invitation ? <>
      <p style={{ color:"#0b1f3a", fontSize:11, fontWeight:800, letterSpacing:".13em", textTransform:"uppercase" }}>Heri CMS · Team invitation</p>
      <h1>Join {invitation.clinicName}.</h1>
      <p>You have been invited as <strong>{role}</strong>. Your account will use <strong>{invitation.email}</strong>.</p>
      <form onSubmit={submit} style={{ display:"grid", gap:14, marginTop:24 }}>
        <label style={{ display:"grid", gap:7, fontWeight:800, fontSize:12 }}>Password<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required style={{ minHeight:50, padding:"0 14px", border:"1px solid #cbd6df", borderRadius:10 }} /></label>
        {error ? <p role="alert" style={{ margin:0, padding:12, borderRadius:10, background:"#fff4f4", color:"#8b2f2f", fontSize:12 }}>{error}</p> : null}
        <button disabled={pending} style={{ minHeight:50, border:0, borderRadius:10, background:"#4ed94e", color:"#07162b", fontWeight:800 }}>{pending ? "Joining workspace…" : "Join Workspace"}</button>
      </form>
    </> : <><h1>This invitation is no longer available.</h1><p>Ask the clinic administrator to create a new invitation.</p><a href="/login">Go to sign in</a></>}
  </main>;
}
