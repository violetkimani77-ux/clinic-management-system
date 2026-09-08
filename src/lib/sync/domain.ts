import "server-only";

import { Prisma, VisitStatus } from "@prisma/client";
import type { AuthContext } from "@/lib/auth/authorization";
import { requirePermission } from "@/lib/auth/authorization";
import { PERMISSIONS } from "@/lib/auth/permissions";

export type SyncDomainMutation = {
  entityType: string;
  entityId: string;
  operationType: "CREATE" | "UPDATE" | "DELETE";
  payload: Record<string, unknown>;
};

export type AppliedSyncEntity = { entityType: string; entityId: string };

function requireString(payload: Record<string, unknown>, field: string): string {
  const value = payload[field];
  if (typeof value !== "string" || value.trim() === "") throw new Error(`SYNC_INVALID_${field.toUpperCase()}`);
  return value.trim();
}
function optionalString(payload: Record<string, unknown>, field: string): string | null | undefined {
  const value = payload[field];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`SYNC_INVALID_${field.toUpperCase()}`);
  return value.trim() || null;
}
function optionalDate(payload: Record<string, unknown>, field: string): Date | null | undefined {
  const value = payload[field];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`SYNC_INVALID_${field.toUpperCase()}`);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`SYNC_INVALID_${field.toUpperCase()}`);
  return date;
}
function requireVisitStatus(payload: Record<string, unknown>): VisitStatus {
  const value = requireString(payload, "status");
  if (!Object.values(VisitStatus).includes(value as VisitStatus)) throw new Error("SYNC_INVALID_STATUS");
  return value as VisitStatus;
}
const ALLOWED_VISIT_TRANSITIONS: Record<VisitStatus, readonly VisitStatus[]> = {
  [VisitStatus.OPEN]: [VisitStatus.IN_PROGRESS, VisitStatus.CANCELLED],
  [VisitStatus.IN_PROGRESS]: [VisitStatus.COMPLETED, VisitStatus.CANCELLED],
  [VisitStatus.COMPLETED]: [],
  [VisitStatus.CANCELLED]: [],
};
function assertVisitTransition(current: VisitStatus, next: VisitStatus): void {
  if (current !== next && !ALLOWED_VISIT_TRANSITIONS[current].includes(next)) throw new Error("INVALID_VISIT_TRANSITION");
}
function requirePatientPermission(context: AuthContext, operationType: SyncDomainMutation["operationType"]): void {
  requirePermission(context, operationType === "CREATE" ? PERMISSIONS.PATIENTS_CREATE : PERMISSIONS.PATIENTS_UPDATE);
}
function requireVisitPermission(context: AuthContext, operationType: SyncDomainMutation["operationType"]): void {
  requirePermission(context, operationType === "CREATE" ? PERMISSIONS.VISITS_CREATE : PERMISSIONS.VISITS_UPDATE);
}

/** Applies a validated offline mutation to the authoritative clinic domain model. */
export async function applySyncDomainMutation(
  tx: Prisma.TransactionClient,
  context: AuthContext,
  mutation: SyncDomainMutation,
): Promise<AppliedSyncEntity> {
  if (mutation.entityType === "Patient") {
    requirePatientPermission(context, mutation.operationType);
    const payload = mutation.payload;
    if (mutation.operationType === "CREATE") {
      await tx.patient.create({
        data: {
          id: mutation.entityId,
          clinicId: context.clinicId,
          patientNo: requireString(payload, "patientNo"),
          firstName: requireString(payload, "firstName"),
          lastName: requireString(payload, "lastName"),
          dateOfBirth: optionalDate(payload, "dateOfBirth") ?? null,
          phone: optionalString(payload, "phone") ?? null,
          email: optionalString(payload, "email")?.toLowerCase() ?? null,
          address: optionalString(payload, "address") ?? null,
          notes: optionalString(payload, "notes") ?? null,
        },
      });
    } else if (mutation.operationType === "UPDATE") {
      const existing = await tx.patient.findFirst({ where: { id: mutation.entityId, clinicId: context.clinicId, archivedAt: null }, select: { id: true } });
      if (!existing) throw new Error("PATIENT_NOT_FOUND");
      const data: Prisma.PatientUpdateInput = {};
      if (payload.firstName !== undefined) data.firstName = requireString(payload, "firstName");
      if (payload.lastName !== undefined) data.lastName = requireString(payload, "lastName");
      if (payload.dateOfBirth !== undefined) data.dateOfBirth = optionalDate(payload, "dateOfBirth") ?? null;
      if (payload.phone !== undefined) data.phone = optionalString(payload, "phone") ?? null;
      if (payload.email !== undefined) data.email = optionalString(payload, "email")?.toLowerCase() ?? null;
      if (payload.address !== undefined) data.address = optionalString(payload, "address") ?? null;
      if (payload.notes !== undefined) data.notes = optionalString(payload, "notes") ?? null;
      if (!Object.keys(data).length) throw new Error("SYNC_EMPTY_UPDATE");
      await tx.patient.update({ where: { id: existing.id }, data });
    } else {
      const existing = await tx.patient.findFirst({ where: { id: mutation.entityId, clinicId: context.clinicId, archivedAt: null }, select: { id: true } });
      if (!existing) throw new Error("PATIENT_NOT_FOUND");
      await tx.patient.update({ where: { id: existing.id }, data: { archivedAt: new Date() } });
    }
    return { entityType: mutation.entityType, entityId: mutation.entityId };
  }

  if (mutation.entityType === "Visit") {
    if (mutation.operationType === "DELETE") throw new Error("SYNC_DELETE_NOT_SUPPORTED");
    requireVisitPermission(context, mutation.operationType);
    const payload = mutation.payload;
    if (mutation.operationType === "CREATE") {
      const patientId = requireString(payload, "patientId");
      const patient = await tx.patient.findFirst({ where: { id: patientId, clinicId: context.clinicId, archivedAt: null }, select: { id: true } });
      if (!patient) throw new Error("PATIENT_NOT_FOUND");
      await tx.visit.create({
        data: {
          id: mutation.entityId,
          clinicId: context.clinicId,
          patientId,
          status: payload.status === undefined ? VisitStatus.OPEN : requireVisitStatus(payload),
          openedAt: optionalDate(payload, "openedAt") ?? new Date(),
          closedAt: optionalDate(payload, "closedAt") ?? null,
          notes: optionalString(payload, "notes") ?? null,
        },
      });
    } else {
      const current = await tx.visit.findFirst({ where: { id: mutation.entityId, clinicId: context.clinicId }, select: { id: true, status: true } });
      if (!current) throw new Error("VISIT_NOT_FOUND");
      const nextStatus = payload.status === undefined ? current.status : requireVisitStatus(payload);
      assertVisitTransition(current.status, nextStatus);
      const data: Prisma.VisitUpdateInput = {};
      if (payload.status !== undefined) data.status = nextStatus;
      if (payload.notes !== undefined) data.notes = optionalString(payload, "notes") ?? null;
      if (payload.closedAt !== undefined) data.closedAt = optionalDate(payload, "closedAt") ?? null;
      if (!Object.keys(data).length) throw new Error("SYNC_EMPTY_UPDATE");
      if (payload.status !== undefined && (nextStatus === VisitStatus.COMPLETED || nextStatus === VisitStatus.CANCELLED) && payload.closedAt === undefined) data.closedAt = new Date();
      await tx.visit.update({ where: { id: current.id }, data });
    }
    return { entityType: mutation.entityType, entityId: mutation.entityId };
  }

  throw new Error("SYNC_ENTITY_TYPE_UNSUPPORTED");
}
