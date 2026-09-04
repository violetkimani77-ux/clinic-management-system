import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { requireAuth } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";

const navigation = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Patients", href: "/patients", permission: PERMISSIONS.PATIENTS_VIEW },
  { label: "Pharmacy", href: "/pharmacy", permission: PERMISSIONS.PHARMACY_VIEW },
  { label: "Accounts", href: "/accounts", permission: PERMISSIONS.ACCOUNTS_VIEW },
  { label: "Reports", href: "/reports", permission: PERMISSIONS.REPORTS_VIEW },
];

/**
 * Displays the authenticated staff workspace and live operational dashboard.
 * Metrics are read from the database during each request rather than stored
 * separately, keeping the dashboard aligned with source records.
 */
export default async function DashboardPage() {
  const context = await requireAuth();
  const metrics = await getDashboardMetrics(context);
  const visibleNavigation = navigation.filter(
    (item) => !item.permission || context.permissions.has(item.permission),
  );

  return (
    <main style={{ minHeight: "100vh", display: "flex" }}>
      <aside style={{ width: 240, padding: 24, borderRight: "1px solid #e5e7eb", background: "#fff" }}>
        <strong>Clinic Management System</strong>
        <p style={{ margin: "8px 0 0", color: "#6b7280", fontSize: 13 }}>{context.roleCode} workspace</p>
        <nav aria-label="Main navigation" style={{ marginTop: 28, display: "grid", gap: 8 }}>
          {visibleNavigation.map((item) => (
            <Link key={item.href} href={item.href} style={{ padding: "10px 12px", borderRadius: 8 }}>{item.label}</Link>
          ))}
        </nav>
      </aside>

      <section style={{ flex: 1, padding: "28px 32px", maxWidth: 1200 }}>
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
          <div>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{context.roleCode} workspace</p>
            <h1 style={{ margin: "8px 0", fontSize: 32 }}>Dashboard</h1>
            <p style={{ margin: 0, color: "#6b7280" }}>Clinic activity and operational items that need attention.</p>
          </div>
          <div style={{ minWidth: 190, padding: "2px 0 0 20px", textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{context.userName}</p>
            <p style={{ margin: "4px 0", color: "#6b7280", fontSize: 12 }}>{context.roleCode}</p>
            <LogoutButton />
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16, marginTop: 32 }}>
          {[
            ["Patients", String(metrics.activePatientCount)],
            ["Visits today", String(metrics.visitsToday)],
            ["Revenue today", `KES ${Number(metrics.revenueToday).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
            ["Outstanding", `KES ${metrics.outstandingAmount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ].map(([label, value]) => (
            <article key={label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>{label}</p>
              <strong style={{ display: "block", marginTop: 10, fontSize: 24 }}>{value}</strong>
            </article>
          ))}
        </div>

        <section style={{ marginTop: 24, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Needs attention</h2>
          <p style={{ margin: "10px 0 0", color: "#6b7280" }}>Alerts will appear here once pharmacy, inventory and accounts workflows are connected.</p>
        </section>
      </section>
    </main>
  );
}
