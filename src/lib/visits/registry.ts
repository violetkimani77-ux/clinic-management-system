import { Prisma, VisitStatus } from "@prisma/client";
import type { AuthContext } from "@/lib/auth/authorization";
import { db } from "@/lib/db";
import { recordAuditEvent } from "@/lib/audit";
import { recordSyncChange } from "@/lib/sync/change-ledger";

/**
 * Visit data access for the clinic workspace.
 *
 * This module owns clinic-scoped visit queries and mutations. It deliberately
 * does not decide which UI actions a user may perform; callers must enforce
 * permissions before invoking mutations.
 */

export type VisitListItem = {
  id: string;
  patientId: string;
  patientNo: string;
  patientName: string;
  status: VisitStatus;
  openedAt: Date;
  closedAt: Date | null;
  notes: string | null;
};

export type VisitProfile = VisitListItem & { createdAt: Date; updatedAt: Date };

function cleanOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listVisits(context: AuthContext, options?: { patientId?: string; todayOnly?: boolean }): Promise<VisitListItem[]> {
  const dayBounds = options?.todayOnly ? getKenyaDayBounds() : null;
  const visits = await db.visit.findMany({
    where: {
      clinicId: context.clinicId,
      ...(options?.patientId ? { patientId: options.patientId } : {}),
      ...(dayBounds ? { openedAt: { gte: dayBounds.dayStart, lt: dayBounds.dayEnd } } : {}),
    },
    orderBy: { openedAt: "desc" },
    take: 100,
    select: { id: true, patientId: true, status: true, openedAt: true, closedAt: true, notes: true, patient: { select: { patientNo: true, firstName: true, lastName: true } } },
  });

  return visits.map((visit) => ({
    id: visit.id,
    patientId: visit.patientId,
    patientNo: visit.patient.patientNo,
    patientName: `${visit.patient.firstName} ${visit.patient.lastName}`,
    status: visit.status,
    openedAt: visit.openedAt,
    closedAt: visit.closedAt,
    notes: visit.notes,
  }));
}

export async function getVisit(context: AuthContext, visitId: string): Promise<VisitProfile | null> {
  const visit = await db.visit.findFirst({
    where: { id: visitId, clinicId: context.clinicId },
    select: { id: true, patientId: true, status: true, openedAt: true, closedAt: true, notes: true, createdAt: true, updatedAt: true, patient: { select: { patientNo: true, firstName: true, lastName: true } } },
  });
  if (!visit) return null;
  return { id: visit.id, patientId: visit.patientId, patientNo: visit.patient.patientNo, patientName: `${visit.patient.firstName} ${visit.patient.lastName}`, status: visit.status, openedAt: visit.openedAt, closedAt: visit.closedAt, notes: visit.notes, createdAt: visit.createdAt, updatedAt: visit.updatedAt };
}

export async function createVisit(context: AuthContext, input: { patientId: string; notes?: string | null }) {
  return db.$transaction(async (tx) => {
    const patient = await tx.patient.findFirst({ where: { id: input.patientId, clinicId: context.clinicId, archivedAt: null }, select: { id: true } });
    if (!patient) throw new Error("PATIENT_NOT_FOUND");

    const visit = await tx.visit.create({
      data: { clinicId: context.clinicId, patientId: patient.id, status: VisitStatus.OPEN, notes: cleanOptionalText(input.notes) },
      select: { id: true, patientId: true, status: true, openedAt: true, closedAt: true, notes: true },
    });

    await recordAuditEvent(context, { action: "VISIT_CREATED", entityType: "Visit", entityId: visit.id, metadata: { patientId: visit.patientId } }, tx);
    await recordSyncChange(tx, { clinicId: context.clinicId, entityType: "Visit", entityId: visit.id, operationType: "CREATE", payload: { id: visit.id, patientId: visit.patientId, status: visit.status, openedAt: visit.openedAt.toISOString(), closedAt: visit.closedAt?.toISOString() ?? null, notes: visit.notes } as Prisma.InputJsonValue });
    return visit;
  });
}

const ALLOWED_TRANSITIONS: Record<VisitStatus, readonly VisitStatus[]> = {
  [VisitStatus.OPEN]: [VisitStatus.IN_PROGRESS, VisitStatus.CANCELLED],
  [VisitStatus.IN_PROGRESS]: [VisitStatus.COMPLETED, VisitStatus.CANCELLED],
  [VisitStatus.COMPLETED]: [],
  [VisitStatus.CANCELLED]: [],
};

export async function updateVisit(context: AuthContext, input: { visitId: string; status?: VisitStatus; notes?: string | null }) {
  return db.$transaction(async (tx) => {
    const current = await tx.visit.findFirst({ where: { id: input.visitId, clinicId: context.clinicId }, select: { id: true, status: true, notes: true } });
    if (!current) throw new Error("VISIT_NOT_FOUND");
    if (input.status && input.status !== current.status && !ALLOWED_TRANSITIONS[current.status].includes(input.status)) throw new Error("INVALID_VISIT_TRANSITION");

    const nextStatus = input.status ?? current.status;
    const visit = await tx.visit.update({
      where: { id: current.id },
      data: { status: nextStatus, notes: input.notes === undefined ? current.notes : cleanOptionalText(input.notes), closedAt: nextStatus === VisitStatus.COMPLETED || nextStatus === VisitStatus.CANCELLED ? new Date() : null },
      select: { id: true, patientId: true, status: true, openedAt: true, closedAt: true, notes: true },
    });

    await recordAuditEvent(context, { action: "VISIT_UPDATED", entityType: "Visit", entityId: visit.id, metadata: { previousStatus: current.status, nextStatus: visit.status } }, tx);
    await recordSyncChange(tx, { clinicId: context.clinicId, entityType: "Visit", entityId: visit.id, operationType: "UPDATE", payload: { id: visit.id, patientId: visit.patientId, status: visit.status, openedAt: visit.openedAt.toISOString(), closedAt: visit.closedAt?.toISOString() ?? null, notes: visit.notes } as Prisma.InputJsonValue });
    return visit;
  });
}

function getKenyaDayBounds() {
  const now = new Date();
  const kenyaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const [year, month, day] = kenyaDate.split("-").map(Number);
  return { dayStart: new Date(Date.UTC(year, month - 1, day, -3)), dayEnd: new Date(Date.UTC(year, month - 1, day + 1, -3)) };
}
