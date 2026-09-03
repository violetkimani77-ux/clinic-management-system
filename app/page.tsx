export default function HomePage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px" }}>
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
      </section>
    </main>
  );
}
