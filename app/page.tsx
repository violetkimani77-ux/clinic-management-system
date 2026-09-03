import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "72px 24px" }}>
      <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 32 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
          Clinic Management System
        </p>
        <h1 style={{ margin: "12px 0", fontSize: 40, lineHeight: 1.1 }}>
          Internal clinic operations, in one system.
        </h1>
        <p style={{ maxWidth: 680, margin: 0, color: "#5f6368", fontSize: 17, lineHeight: 1.6 }}>
          A staff-only workspace for patient records, pharmacy, accounts and clinic operations.
        </p>
        <Link
          href="/dashboard"
          style={{ display: "inline-block", marginTop: 24, padding: "11px 16px", borderRadius: 8, background: "#17191c", color: "#fff", fontWeight: 700 }}
        >
          Open staff workspace
        </Link>
      </section>
    </main>
  );
}
