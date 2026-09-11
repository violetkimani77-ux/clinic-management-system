import Link from "next/link";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getInventoryOverview } from "@/lib/pharmacy/inventory";
import styles from "@/components/dashboard/workspace-page.module.css";
import { createMedicineAction, receiveStockAction, adjustStockAction, returnOrDisposeStockAction } from "../inventory-actions";

/**
 * Inventory is the operational stock surface for pharmacy staff. Catalog,
 * receiving and adjustments stay here; dispensing remains on the queue page.
 */
export default async function PharmacyInventoryPage() {
  const context = await requireClinicPermission(PERMISSIONS.PHARMACY_VIEW);
  const overview = await getInventoryOverview(context);
  const canAdjust = context.permissions.has(PERMISSIONS.PHARMACY_STOCK_ADJUST);

  return (
    <WorkspaceShell context={context} activeHref="/pharmacy">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href="/pharmacy" className={styles.backLink}>← Back to Pharmacy</Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Pharmacy inventory</p>
          <h1 className={styles.title}>Inventory & stock</h1>
          <p className={styles.description}>Manage the medicine catalogue, receive stock batches and record controlled stock adjustments.</p>
        </header>

        <section className={styles.cardGrid} aria-label="Inventory overview">
          <article className={styles.card}><p className={styles.cardLabel}>Medicines</p><p className={styles.cardValue}>{overview.medicines.length}</p><p className={styles.cardHint}>Active catalogue items</p></article>
          <article className={styles.card}><p className={styles.cardLabel}>Batches</p><p className={styles.cardValue}>{overview.batches.length}</p><p className={styles.cardHint}>Stock batches currently recorded</p></article>
          <article className={styles.card}><p className={styles.cardLabel}>Low stock</p><p className={styles.cardValue}>{overview.medicines.filter((medicine) => medicine.totalQuantity <= medicine.reorderLevel).length}</p><p className={styles.cardHint}>At or below reorder level</p></article>
          <article className={styles.card}><p className={styles.cardLabel}>Expiry watch</p><p className={styles.cardValue}>{overview.batches.filter((batch) => batch.expiryDate <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length}</p><p className={styles.cardHint}>Batches within 30 days</p></article>
        </section>

        {canAdjust ? (
          <section className={styles.section} aria-labelledby="catalog-title">
            <h2 id="catalog-title" className={styles.sectionTitle}>Add medicine</h2>
            <p className={styles.sectionDescription}>Create the catalogue item before receiving its stock batches.</p>
            <form action={createMedicineAction} className={styles.patientForm}>
              <div className={styles.formGrid}>
                <label className={styles.field}><span>Medicine name</span><input name="name" required /></label>
                <label className={styles.field}><span>Strength</span><input name="strength" placeholder="e.g. 500mg" /></label>
                <label className={styles.field}><span>Form</span><input name="form" placeholder="e.g. Tablet" /></label>
                <label className={styles.field}><span>Reorder level</span><input name="reorderLevel" type="number" min="0" step="1" defaultValue="0" required /></label>
              </div>
              <div className={styles.formActions}><button type="submit" className={styles.primaryButton}>Add medicine</button></div>
            </form>
          </section>
        ) : null}

        {canAdjust ? (
          <section className={styles.section} aria-labelledby="receive-title">
            <h2 id="receive-title" className={styles.sectionTitle}>Receive stock</h2>
            <p className={styles.sectionDescription}>Receiving adds stock and records a PURCHASE movement. Existing batch numbers are consolidated within the clinic.</p>
            <form action={receiveStockAction} className={styles.patientForm}>
              <div className={styles.formGrid}>
                <label className={styles.field}><span>Medicine</span><select name="medicineId" required defaultValue=""><option value="" disabled>Select medicine</option>{overview.medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name}{medicine.strength ? ` ${medicine.strength}` : ""}</option>)}</select></label>
                <label className={styles.field}><span>Batch number</span><input name="batchNumber" required /></label>
                <label className={styles.field}><span>Expiry date</span><input name="expiryDate" type="date" required /></label>
                <label className={styles.field}><span>Quantity received</span><input name="quantity" type="number" min="1" step="1" required /></label>
                <label className={styles.field}><span>Unit cost (KES)</span><input name="unitCost" type="number" min="0" step="0.01" required /></label>
                <label className={styles.field}><span>Selling price (KES)</span><input name="sellingPrice" type="number" min="0" step="0.01" required /></label>
                <label className={styles.fieldWide}><span>Supplier</span><input name="supplierName" /></label>
              </div>
              <div className={styles.formActions}><button type="submit" className={styles.primaryButton}>Receive stock</button></div>
            </form>
          </section>
        ) : null}

        <section className={styles.section} aria-labelledby="medicines-title">
          <h2 id="medicines-title" className={styles.sectionTitle}>Medicine catalogue</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>Active medicine catalogue and stock balances</caption>
              <thead><tr><th>Medicine</th><th>Form</th><th>Stock</th><th>Reorder</th><th>Batches</th></tr></thead>
              <tbody>
                {overview.medicines.map((medicine) => <tr key={medicine.id}><td><strong>{medicine.name}</strong>{medicine.strength ? <div className={styles.cardHint}>{medicine.strength}</div> : null}</td><td>{medicine.form || "—"}</td><td>{medicine.totalQuantity}</td><td>{medicine.reorderLevel}</td><td>{medicine.batchCount}</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="batches-title">
          <h2 id="batches-title" className={styles.sectionTitle}>Stock batches</h2>
          <p className={styles.sectionDescription}>Batches are ordered by expiry so pharmacy can follow FEFO when dispensing.</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <caption className={styles.srOnly}>Stock batches and expiry dates</caption>
              <thead><tr><th>Medicine</th><th>Batch</th><th>Expiry</th><th>Quantity</th><th>Supplier</th>{canAdjust ? <th>Stock operation</th> : null}</tr></thead>
              <tbody>
                {overview.batches.map((batch) => <tr key={batch.id}>
                  <td>{batch.medicineName}</td><td>{batch.batchNumber}</td><td>{batch.expiryDate.toLocaleDateString("en-KE")}</td><td>{batch.quantity}</td><td>{batch.supplierName || "—"}</td>
                  {canAdjust ? <td>
                    <form action={adjustStockAction}>
                      <input type="hidden" name="batchId" value={batch.id} />
                      <div className={styles.formActions}><input name="delta" type="number" step="1" placeholder="± qty" aria-label={`Adjustment for ${batch.batchNumber}`} required /><input name="reason" placeholder="Reason" aria-label={`Reason for ${batch.batchNumber}`} required /><button type="submit" className={styles.secondaryButton}>Adjust</button></div>
                    </form>
                    <details>
                      <summary>Return / dispose</summary>
                      <form action={returnOrDisposeStockAction} className={styles.patientForm}>
                        <input type="hidden" name="batchId" value={batch.id} />
                        <div className={styles.formGrid}>
                          <label className={styles.field}><span>Operation</span><select name="operation" defaultValue="DISPOSAL"><option value="RETURN">Return to stock</option><option value="DISPOSAL">Dispose stock</option></select></label>
                          <label className={styles.field}><span>Quantity</span><input name="quantity" type="number" min="1" max={batch.quantity} step="1" required /></label>
                          <label className={styles.fieldWide}><span>Reason</span><input name="reason" required /></label>
                        </div>
                        <div className={styles.formActions}><button type="submit" className={styles.secondaryButton}>Record operation</button></div>
                      </form>
                    </details>
                  </td> : null}
                </tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
