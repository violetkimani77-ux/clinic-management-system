import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function AccountsPage() {
  await requireClinicPermission(PERMISSIONS.ACCOUNTS_VIEW);

  return (
    <main style={{ minHeight: "100vh", padding: "40px 32px" }}>
      <p style={{ margin: 0, color: "#6b7280", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        Accounts workspace
      </p>
      <h1 style={{ margin: "8px 0" }}>Accounts</h1>
      <p style={{ color: "#6b7280" }}>
        Invoices, payments, receivables and financial reporting will be connected here.
      </p>
    </main>
  );
}
