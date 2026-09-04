import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireAuth } from "@/lib/auth/guards";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";

/**
 * Displays the authenticated admin workspace and live operational dashboard.
 * Metrics are read from the database during each request rather than stored
 * separately, keeping the dashboard aligned with source records.
 */
export default async function DashboardPage() {
  const context = await requireAuth();
  const metrics = await getDashboardMetrics(context);

  return (
    <WorkspaceShell context={context} activeHref="/dashboard">
      <div>
        <p
          style={{
            margin: 0,
            color: "#6b7280",
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {context.roleCode} workspace
        </p>
        <h1 style={{ margin: "8px 0", fontSize: 32 }}>Dashboard</h1>
        <p style={{ margin: 0, color: "#6b7280" }}>
          Clinic activity and operational items that need attention.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginTop: 32,
        }}
      >
        {[
          ["Patients", String(metrics.activePatientCount)],
          ["Visits today", String(metrics.visitsToday)],
          [
            "Revenue today",
            `KES ${Number(metrics.revenueToday).toLocaleString("en-KE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          ],
          [
            "Outstanding",
            `KES ${metrics.outstandingAmount.toLocaleString("en-KE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          ],
        ].map(([label, value]) => (
          <article
            key={label}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 20,
            }}
          >
            <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>{label}</p>
            <strong style={{ display: "block", marginTop: 10, fontSize: 24 }}>
              {value}
            </strong>
          </article>
        ))}
      </div>

      <section
        style={{
          marginTop: 24,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 24,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Needs attention</h2>
        <p style={{ margin: "10px 0 0", color: "#6b7280" }}>
          Alerts will appear here once pharmacy, inventory and accounts
          workflows are connected.
        </p>
      </section>
    </WorkspaceShell>
  );
}
