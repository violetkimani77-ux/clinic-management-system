import { LogoutButton } from "@/components/auth/logout-button";

/**
 * Keeps the authenticated staff identity and sign-out control visually
 * separate from the page content so it remains easy to locate.
 */
export function StaffProfile({ userName, roleCode }: { userName: string; roleCode: string }) {
  return (
    <header
      style={{
        borderBottom: "1px solid #e5e7eb",
        background: "#fff",
        padding: "14px 32px",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div style={{ textAlign: "right" }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{userName}</p>
        <p style={{ margin: "3px 0 6px", color: "#6b7280", fontSize: 12 }}>{roleCode}</p>
        <LogoutButton />
      </div>
    </header>
  );
}
