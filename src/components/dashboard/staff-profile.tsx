import { LogoutButton } from "@/components/auth/logout-button";

/**
 * Keeps the authenticated staff identity and sign-out control together in a
 * compact card in the global top bar. Each identity item stays on its own
 * line so the staff member can scan name, role, and sign-out independently.
 * Missing profile names intentionally render as the neutral "User" label.
 */
export function StaffProfile({ userName, roleCode }: { userName: string; roleCode: string }) {
  const displayName = userName.trim() || "User";

  return (
    <div className="staffProfile" aria-label="Staff account">
      <span className="staffName">{displayName}</span>
      <span className="staffRole">{roleCode}</span>
      <LogoutButton />
    </div>
  );
}
