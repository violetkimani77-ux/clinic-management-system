import { LogoutButton } from "@/components/auth/logout-button";

/**
 * Keeps the authenticated staff identity and sign-out control together in a
 * compact card in the global top bar. Each identity item stays on its own
 * line so the staff member can scan name, role, and sign-out independently.
 */
export function StaffProfile({ userName, roleCode }: { userName: string; roleCode: string }) {
  return (
    <div className="staffProfile" aria-label="Staff account">
      <span className="staffName">{userName}</span>
      <span className="staffRole">{roleCode}</span>
      <LogoutButton />
    </div>
  );
}
