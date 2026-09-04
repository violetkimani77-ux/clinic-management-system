import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

/** Displays the authenticated pharmacy workspace. */
export default async function PharmacyPage() {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_VIEW);

  return (
    <WorkspaceShell context={context} activeHref="/pharmacy">
      <nav aria-label="Page navigation" style={{ marginBottom: 28 }}>
        <Link href="/dashboard">← Back to Dashboard</Link>
      </nav>
      <p style={{ margin: 0, color: "#6b7280", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        Pharmacy workspace
      </p>
      <h1 style={{ margin: "8px 0" }}>Pharmacy</h1>
      <p style={{ color: "#6b7280" }}>
        Prescriptions, dispensing and inventory workflows will be connected here.
      </p>
    </WorkspaceShell>
  );
}
