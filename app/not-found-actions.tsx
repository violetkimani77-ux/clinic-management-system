"use client";

export function NotFoundActions() {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 48,
        padding: "0 22px",
        border: "1px solid rgba(11,38,51,.14)",
        borderRadius: 12,
        background: "#fff",
        color: "#173445",
        fontSize: 13,
        fontWeight: 800,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      Go back
    </button>
  );
}
