import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function ReportsPage() {
  await requireClinicPermission(PERMISSIONS.REPORTS_VIEW);

  return (
    <main style={{ minHeight: "100vh", padding: "40px 32px" }}>
      <p style={{ margin: 0, color: "#6b7280", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        Reporting
      </p>
      <h1 style={{ margin: "8px 0" }}>Reports</h1>
      <p style={{ color: "#6b7280" }}>
        Operational and financial reports will be connected here as source workflows are implemented.
      </p>
    </main>
  );
}
