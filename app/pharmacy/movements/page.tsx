import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getStockMovements } from "@/lib/pharmacy/inventory";
import styles from "@/components/dashboard/workspace-page.module.css";

export default async function PharmacyMovementsPage() {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_VIEW);
  const movements = await getStockMovements(context);
  return <WorkspaceShell context={context} activeHref="/pharmacy"><div className={styles.page}>
    <nav><Link href="/pharmacy/inventory" className={styles.backLink}>← Back to Inventory</Link></nav>
    <header className={styles.hero}><p className={styles.eyebrow}>Pharmacy inventory</p><h1 className={styles.title}>Stock movement history</h1><p className={styles.description}>Append-only operational history for purchases, dispensing, returns, expiry, disposal and adjustments.</p></header>
    <section className={styles.section} aria-labelledby="movement-title"><h2 id="movement-title" className={styles.sectionTitle}>Recent movements</h2><div className={styles.tableWrap}><table className={styles.table}><caption className={styles.srOnly}>Recent stock movements</caption><thead><tr><th>When</th><th>Medicine</th><th>Batch</th><th>Type</th><th>Quantity</th><th>Reason</th></tr></thead><tbody>{movements.map((m)=><tr key={m.id}><td>{m.createdAt.toLocaleString("en-KE")}</td><td>{m.medicineName}</td><td>{m.batchNumber}</td><td>{m.type}</td><td>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td><td>{m.reason || "—"}</td></tr>)}</tbody></table></div></section>
  </div></WorkspaceShell>;
}
