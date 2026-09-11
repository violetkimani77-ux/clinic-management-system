import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getPharmacyOverview } from "@/lib/pharmacy/registry";
import { dispensePrescriptionAction } from "./actions";
import styles from "@/components/dashboard/workspace-page.module.css";

export default async function PharmacyPage() {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_VIEW);
  const overview = await getPharmacyOverview(context);
  const canDispense = context.permissions.has(PERMISSIONS.PHARMACY_DISPENSE);
  const canAdjust = context.permissions.has(PERMISSIONS.PHARMACY_STOCK_ADJUST);

  return (
    <WorkspaceShell context={context} activeHref="/pharmacy">
      <div className={styles.page}>
        <nav aria-label="Page navigation"><Link href="/dashboard" className={styles.backLink}>← Back to Dashboard</Link></nav>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>Pharmacy workspace</p>
          <h1 className={styles.title}>Pharmacy</h1>
          <p className={styles.description}>Manage prescriptions, dispensing, stock and medicine batches from one workspace.</p>
          {canAdjust ? <p><Link href="/pharmacy/inventory" className={styles.secondaryButton}>Open inventory & stock</Link></p> : null}
        </header>

        <section className={styles.cardGrid} aria-label="Pharmacy overview">
          {[
            ["Prescriptions", overview.prescriptions.length.toString(), "Awaiting pharmacy processing"],
            ["Dispensed today", overview.dispensedTodayCount.toString(), "Completed dispensing records"],
            ["Low stock", overview.lowStockMedicines.length.toString(), "Medicines at or below reorder level"],
            ["Expiring soon", overview.expiringSoonBatchCount.toString(), "Batches expiring within 30 days"],
          ].map(([label, value, hint]) => <article key={label} className={styles.card}><p className={styles.cardLabel}>{label}</p><p className={styles.cardValue}>{value}</p><p className={styles.cardHint}>{hint}</p></article>)}
        </section>

        <section className={styles.section} aria-labelledby="prescriptions-title">
          <h2 id="prescriptions-title" className={styles.sectionTitle}>Prescriptions awaiting pharmacy</h2>
          <p className={styles.sectionDescription}>Dispense all remaining quantities at once, or enter per-medicine quantities for a partial dispensing.</p>
          {overview.prescriptions.length === 0 ? (
            <div className={styles.emptyState}><strong>No prescriptions awaiting pharmacy.</strong><p>New prescriptions sent from visits will appear here.</p></div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <caption className={styles.srOnly}>Prescriptions awaiting pharmacy processing</caption>
                <thead><tr><th scope="col">Patient</th><th scope="col">Prescription</th><th scope="col">Medicines</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
                <tbody>
                  {overview.prescriptions.map((prescription) => (
                    <tr key={prescription.id}>
                      <td><Link href={`/patients/${prescription.patientId}`} className={styles.patientLink}>{prescription.patientName}</Link><div className={styles.cardHint}>{prescription.patientNo}</div></td>
                      <td>{prescription.createdAt.toLocaleDateString("en-KE")}</td>
                      <td>
                        {prescription.items.map((item) => <div key={item.id}>
                          <strong>{item.medicineName}{item.strength ? ` ${item.strength}` : ""}</strong> × {item.remainingQuantity} remaining
                          {item.form ? <span className={styles.cardHint}> · {item.form}</span> : null}
                          {item.remainingQuantity < item.quantity ? <div className={styles.cardHint}>Original: {item.quantity}</div> : null}
                          {item.dosage || item.frequency || item.duration ? <div className={styles.cardHint}>{[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ")}</div> : null}
                        </div>)}
                      </td>
                      <td>{prescription.status.replaceAll("_", " ")}</td>
                      <td>
                        {canDispense ? <div>
                          <form action={dispensePrescriptionAction}>
                            <input type="hidden" name="prescriptionId" value={prescription.id} />
                            <button type="submit" className={styles.primaryButton}>Dispense all remaining</button>
                          </form>
                          <details>
                            <summary>Partial dispensing</summary>
                            <form action={dispensePrescriptionAction}>
                              <input type="hidden" name="prescriptionId" value={prescription.id} />
                              <input type="hidden" name="partial" value="true" />
                              {prescription.items.map((item) => <label key={item.id} style={{ display: "block", marginTop: "0.5rem" }}>
                                {item.medicineName} quantity
                                <input type="number" name={`quantity_${item.medicineId}`} min="0" max={item.remainingQuantity} defaultValue={item.remainingQuantity} style={{ display: "block", width: "6rem" }} />
                              </label>)}
                              <button type="submit" className={styles.secondaryButton} style={{ marginTop: "0.75rem" }}>Dispense entered quantities</button>
                            </form>
                          </details>
                        </div> : <span className={styles.permissionHint}>View only</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={styles.section} aria-labelledby="inventory-alerts-title">
          <h2 id="inventory-alerts-title" className={styles.sectionTitle}>Inventory alerts</h2>
          <p className={styles.sectionDescription}>Live stock and expiry indicators from the clinic inventory.</p>
          <div className={styles.workflowGrid}>
            <article className={styles.workflowCard}><strong>Low stock</strong>{overview.lowStockMedicines.length === 0 ? <p>No medicines are currently at or below reorder level.</p> : <p>{overview.lowStockMedicines.map((medicine) => `${medicine.name} (${medicine.currentQuantity})`).join(", ")}</p>}</article>
            <article className={styles.workflowCard}><strong>Expired batches</strong><p>{overview.expiredBatchCount} batch{overview.expiredBatchCount === 1 ? "" : "es"} currently expired.</p></article>
            <article className={styles.workflowCard}><strong>Expiring within 30 days</strong><p>{overview.expiringSoonBatchCount} batch{overview.expiringSoonBatchCount === 1 ? "" : "es"} need expiry attention.</p></article>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
