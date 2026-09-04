import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

/** Displays the authenticated reporting workspace. */
export default async function ReportsPage() {
  const context = await requireClinicPermission(PERMISSIONS.REPORTS_VIEW);

  return (
    <WorkspaceShell context={context} activeHref="/reports">
      <nav aria-label="Page navigation" style={{ marginBottom: 28 }}>
        <Link href="/dashboard">← Back to Dashboard</Link>
      </nav>
      <p style={{ margin: 0, color: "#6b7280", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        Reporting
      </p>
      <h1 style={{ margin: "8px 0" }}>Reports</h1>
      <p style={{ color: "#6b7280" }}>
        Operational and financial reports will be connected here as source workflows are implemented.
      </p>
    </WorkspaceShell>
  );
}
