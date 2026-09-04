import { LogoutButton } from "@/components/auth/logout-button";

/**
 * Keeps the authenticated staff identity and sign-out control together in the
 * global top bar. The clinic name is rendered by WorkspaceShell beside it.
 */
export function StaffProfile({ userName, roleCode }: { userName: string; roleCode: string }) {
  return (
    <div className="staffProfile">
      <div className="staffIdentity">
        <span className="staffName">{userName}</span>
        <span className="staffRole">{roleCode}</span>
      </div>
      <LogoutButton />
    </div>
  );
}
