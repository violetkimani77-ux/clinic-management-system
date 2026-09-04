import Link from "next/link";
import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/dashboard/workspace-shell";
import styles from "@/components/dashboard/workspace-page.module.css";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getVisit } from "@/lib/visits/registry";
import { getVisitPrescriptions, listActiveMedicines } from "@/lib/prescriptions/registry";
import { updateVisitRecord } from "../actions";
import { createPrescriptionAction, sendPrescriptionToPharmacyAction } from "../prescription-actions";

/**
 * Displays one clinic-scoped visit and connects the visit to the prescription
 * workflow. Prescription data remains a separate domain record attached to the
 * visit, then moves explicitly into the Pharmacy queue.
 */
export default async function VisitPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const context = await requireClinicPermission(PERMISSIONS.VISITS_VIEW);
  const { visitId } = await params;
  const visit = await getVisit(context, visitId);

  if (!visit) notFound();

  const [prescriptions, medicines] = await Promise.all([
    getVisitPrescriptions(context, visitId),
    listActiveMedicines(context),
  ]);

  const canUpdate = context.permissions.has(PERMISSIONS.VISITS_UPDATE);
  const canPrescribe = context.permissions.has(PERMISSIONS.PRESCRIPTIONS_CREATE);
  const canSendToPharmacy = context.permissions.has(PERMISSIONS.PRESCRIPTIONS_SEND);
  const isTerminal = visit.status === "COMPLETED" || visit.status === "CANCELLED";

  return (
    <WorkspaceShell context={context} activeHref="/visits">
      <div className={styles.page}>
        <nav aria-label="Page navigation">
          <Link href={`/patients/${visit.patientId}`} className={styles.backLink}>← Back to Patient</Link>
        </nav>

        <header className={styles.hero}>
          <p className={styles.eyebrow}>Clinical visit</p>
          <h1 className={styles.title}>{visit.patientName}</h1>
          <p className={styles.description}>
            {visit.patientNo} · Opened {visit.openedAt.toLocaleDateString("en-KE")} {visit.openedAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </header>

        <section className={styles.section} aria-labelledby="visit-status">
          <h2 id="visit-status" className={styles.sectionTitle}>Visit status</h2>
          <p className={styles.permissionHint}>{visit.status.replaceAll("_", " ")}</p>
          {canUpdate && !isTerminal ? (
            <form action={updateVisitRecord} className={styles.patientForm}>
              <input type="hidden" name="visitId" value={visit.id} />
              <label className={styles.field}><span>Update status</span><select name="status" defaultValue={visit.status} className={styles.input}><option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></label>
              <label className={styles.field}><span>Visit notes</span><textarea name="notes" rows={5} defaultValue={visit.notes ?? ""} className={styles.textarea} /></label>
              <div className={styles.formActions}><button type="submit" className={styles.primaryButton}>Save visit</button></div>
            </form>
          ) : (
            <div className={styles.emptyState}><strong>{isTerminal ? "This visit is closed." : "View only"}</strong><p>{isTerminal ? "Completed and cancelled visits cannot be reopened in the MVP workflow." : "You do not have permission to update this visit."}</p></div>
          )}
        </section>

        <section className={styles.section} aria-labelledby="prescription-title">
          <h2 id="prescription-title" className={styles.sectionTitle}>Prescription</h2>
          <p className={styles.sectionDescription}>Create a prescription during an active visit, then explicitly send it to Pharmacy.</p>

          {canPrescribe && !isTerminal ? (
            <form action={createPrescriptionAction} className={styles.patientForm}>
              <input type="hidden" name="visitId" value={visit.id} />
              <div className={styles.formGrid}>
                <label className={styles.fieldWide}>
                  <span>Medicine</span>
                  <select name="medicineId" className={styles.input} required defaultValue="">
                    <option value="" disabled>Select medicine</option>
                    {medicines.map((medicine) => <option key={medicine.id} value={medicine.id}>{medicine.name}{medicine.strength ? ` ${medicine.strength}` : ""}{medicine.form ? ` · ${medicine.form}` : ""}</option>)}
                  </select>
                </label>
                <label className={styles.field}><span>Quantity</span><input name="quantity" type="number" min="1" step="1" className={styles.input} required /></label>
                <label className={styles.field}><span>Dosage</span><input name="dosage" className={styles.input} placeholder="e.g. 1 tablet" /></label>
                <label className={styles.field}><span>Frequency</span><input name="frequency" className={styles.input} placeholder="e.g. twice daily" /></label>
                <label className={styles.field}><span>Duration</span><input name="duration" className={styles.input} placeholder="e.g. 5 days" /></label>
                <label className={styles.fieldWide}><span>Instructions</span><textarea name="instructions" rows={3} className={styles.textarea} /></label>
                <label className={styles.fieldWide}><span>Prescription notes</span><textarea name="notes" rows={3} className={styles.textarea} /></label>
              </div>
              <div className={styles.formActions}><button type="submit" className={styles.primaryButton}>Create Prescription</button></div>
            </form>
          ) : null}

          {prescriptions.length === 0 ? (
            <div className={styles.emptyState}><strong>No prescriptions for this visit.</strong><p>{canPrescribe && !isTerminal ? "Create the prescription above to continue the workflow." : "No prescription has been recorded for this visit."}</p></div>
          ) : (
            <div className={styles.workflowGrid}>
              {prescriptions.map((prescription) => (
                <article key={prescription.id} className={styles.workflowCard}>
                  <strong>{prescription.status.replaceAll("_", " ")}</strong>
                  <p>{prescription.items.map((item) => `${item.medicine.name}${item.medicine.strength ? ` ${item.medicine.strength}` : ""} × ${item.quantity}`).join(", ")}</p>
                  {prescription.items.map((item) => (
                    <p key={item.id} className={styles.cardHint}>{[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ")}</p>
                  ))}
                  {prescription.status === "CREATED" && canSendToPharmacy ? (
                    <form action={sendPrescriptionToPharmacyAction}>
                      <input type="hidden" name="prescriptionId" value={prescription.id} />
                      <button type="submit" className={styles.primaryButton}>Send to Pharmacy</button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.section} aria-labelledby="next-workflow">
          <h2 id="next-workflow" className={styles.sectionTitle}>Workflow</h2>
          <div className={styles.workflowGrid}>
            <div className={styles.workflowCard}><strong>Prescription</strong><p>Create and explicitly send the prescription to the Pharmacy queue.</p></div>
            <div className={styles.workflowCard}><strong>Pharmacy</strong><p>Pharmacy reviews the queue, dispenses available stock using FEFO and records stock movements.</p></div>
            <div className={styles.workflowCard}><strong>Billing</strong><p>Visit-related charges will flow into Accounts without duplicating patient records.</p></div>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
