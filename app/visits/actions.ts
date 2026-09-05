"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClinicPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { createVisit, updateVisit } from "@/lib/visits/registry";
import { VisitStatus } from "@prisma/client";

/** Opens a new visit after enforcing the clinic permission server-side. */
export async function openVisit(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.VISITS_CREATE);
  const patientId = String(formData.get("patientId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "");

  if (!patientId) throw new Error("PATIENT_ID_REQUIRED");

  const visit = await createVisit(context, { patientId, notes });
  revalidatePath("/dashboard");
  revalidatePath("/visits");
  revalidatePath(`/patients/${patientId}`);
  redirect(`/visits/${visit.id}`);
}

/** Updates visit notes or advances the visit through its allowed workflow. */
export async function updateVisitRecord(formData: FormData) {
  const context = await requireClinicPermission(PERMISSIONS.VISITS_UPDATE);
  const visitId = String(formData.get("visitId") ?? "").trim();
  const statusValue = String(formData.get("status") ?? "").trim();
  const notes = String(formData.get("notes") ?? "");

  if (!visitId) throw new Error("VISIT_ID_REQUIRED");
  if (!Object.values(VisitStatus).includes(statusValue as VisitStatus)) {
    throw new Error("INVALID_VISIT_STATUS");
  }

  const visit = await updateVisit(context, {
    visitId,
    status: statusValue as VisitStatus,
    notes,
  });

  revalidatePath("/dashboard");
  revalidatePath("/visits");
  revalidatePath(`/visits/${visitId}`);
  revalidatePath(`/patients/${visit.patientId}`);
}
