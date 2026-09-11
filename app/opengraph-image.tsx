import { ImageResponse } from "next/og";

export const alt = "Heri CMS — Clinic Management System";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 78px", background: "#07162B", color: "white", fontFamily: "Arial" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 58, height: 58, borderRadius: 16, background: "#4ED94E", display: "flex", alignItems: "center", justifyContent: "center", color: "#07162B", fontSize: 30, fontWeight: 800 }}>H</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 800 }}>Heri CMS</div>
            <div style={{ fontSize: 14, letterSpacing: 3, color: "#9FB0C1" }}>CLINIC MANAGEMENT SYSTEM</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 980 }}>
          <div style={{ fontSize: 60, lineHeight: 1.05, fontWeight: 800, letterSpacing: -2 }}>One secure platform for your clinic operations</div>
          <div style={{ marginTop: 24, fontSize: 24, lineHeight: 1.45, color: "#B9C7D5" }}>Patient care, visits, pharmacy, accounts and reporting in one connected workflow.</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 18, color: "#9FDDA0" }}>hericms</div>
          <div style={{ padding: "10px 18px", borderRadius: 999, border: "1px solid rgba(78,217,78,.35)", color: "#9FE39F", fontSize: 16 }}>Clinic operations, connected</div>
        </div>
      </div>
    ),
    size,
  );
}
