import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Hali CMS — Clinic Management System";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#f8fafc",
          color: "#0f172a",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 700 }}>Hali CMS</div>
        <div style={{ fontSize: 64, fontWeight: 800, marginTop: 20 }}>
          Clinic Management System
        </div>
        <div style={{ color: "#475569", fontSize: 30, marginTop: 24 }}>
          Secure tools for clinic teams.
        </div>
      </div>
    ),
    size,
  );
}
