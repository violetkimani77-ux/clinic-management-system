import Link from "next/link";

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "40px 24px",
        background:
          "radial-gradient(circle at 50% 35%, rgba(78,217,78,.10), transparent 34%), linear-gradient(180deg, #f7faf8 0%, #eef4f1 100%)",
        color: "#07162b",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <section
        style={{
          width: "min(720px, 100%)",
          textAlign: "center",
          padding: "56px 34px",
          border: "1px solid rgba(11,38,51,.10)",
          borderRadius: "28px",
          background: "rgba(255,255,255,.88)",
          boxShadow: "0 30px 90px rgba(7,22,43,.12)",
          backdropFilter: "blur(14px)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 58,
            height: 58,
            margin: "0 auto 24px",
            display: "grid",
            placeItems: "center",
            borderRadius: 16,
            background: "#07162b",
            boxShadow: "0 12px 30px rgba(7,22,43,.18)",
            color: "#4ED94E",
            fontSize: 25,
            fontWeight: 800,
            letterSpacing: "-.06em",
          }}
        >
          H
        </div>

        <p
          style={{
            margin: 0,
            color: "#527064",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: ".16em",
            textTransform: "uppercase",
          }}
        >
          Heri CMS · Clinic Management System
        </p>

        <p
          aria-hidden="true"
          style={{
            margin: "18px 0 4px",
            color: "#4ED94E",
            fontSize: "clamp(72px, 15vw, 132px)",
            lineHeight: .82,
            fontWeight: 800,
            letterSpacing: "-.09em",
          }}
        >
          404
        </p>

        <h1
          style={{
            margin: "24px 0 0",
            color: "#07162b",
            fontSize: "clamp(28px, 5vw, 44px)",
            lineHeight: 1.08,
            letterSpacing: "-.045em",
          }}
        >
          This page is not part of the clinic workspace.
        </h1>

        <p
          style={{
            maxWidth: 500,
            margin: "18px auto 0",
            color: "#5b6d7d",
            fontSize: 15,
            lineHeight: 1.7,
          }}
        >
          The link may be outdated, moved, or simply not exist. Let us get you back to a useful place.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 30,
          }}
        >
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
              padding: "0 22px",
              borderRadius: 12,
              background: "#07162b",
              color: "#fff",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
              boxShadow: "0 12px 26px rgba(7,22,43,.16)",
            }}
          >
            Return to Heri CMS
          </Link>
          <Link
            href="/trial"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 48,
              padding: "0 22px",
              borderRadius: 12,
              border: "1px solid rgba(11,38,51,.14)",
              background: "#fff",
              color: "#173445",
              fontSize: 13,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Start a Free Trial
          </Link>
        </div>
      </section>
    </main>
  );
}
