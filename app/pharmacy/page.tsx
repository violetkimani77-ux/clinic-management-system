import Link from "next/link";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function PharmacyPage() {
  await requireClinicPermission(PERMISSIONS.PHARMACY_VIEW);

  return (
    <main style={{ minHeight: "100vh", padding: "40px 32px" }}>
      <nav aria-label="Page navigation" style={{ marginBottom: 28 }}>
        <Link href="/dashboard">← Dashboard</Link>
      </nav>
      <p style={{ margin: 0, color: "#6b7280", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
        Pharmacy workspace
      </p>
      <h1 style={{ margin: "8px 0" }}>Pharmacy</h1>
      <p style={{ color: "#6b7280" }}>
        Prescriptions, dispensing and inventory workflows will be connected here.
      </p>
    </main>
  );
}
