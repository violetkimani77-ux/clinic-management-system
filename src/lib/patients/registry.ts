import "server-only";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/authorization";
import { recordAuditEvent } from "@/lib/audit";
import { recordSyncChange } from "@/lib/sync/change-ledger";

export type PatientSearchResult = {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  dateOfBirth: Date | null;
  archivedAt: Date | null;
};

export type PatientProfile = {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

function createPatientNumber(): string {
  const date = new Date();
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
  const suffix = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return `P-${day}-${suffix}`;
}

export async function searchPatients(context: AuthContext, query = ""): Promise<PatientSearchResult[]> {
  const normalizedQuery = query.trim();
  const patients = await db.patient.findMany({
    where: {
      clinicId: context.clinicId,
      archivedAt: null,
      ...(normalizedQuery
        ? { OR: [
            { patientNo: { contains: normalizedQuery, mode: "insensitive" } },
            { firstName: { contains: normalizedQuery, mode: "insensitive" } },
            { lastName: { contains: normalizedQuery, mode: "insensitive" } },
            { phone: { contains: normalizedQuery, mode: "insensitive" } },
          ] }
        : {}),
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 50,
    select: { id: true, patientNo: true, firstName: true, lastName: true, phone: true, dateOfBirth: true, archivedAt: true },
  });

  await recordAuditEvent(context, {
    action: "PATIENT_SEARCHED",
    entityType: "Patient",
    metadata: { resultCount: patients.length },
  });

  return patients;
}

export async function getPatientProfile(context: AuthContext, patientId: string): Promise<PatientProfile | null> {
  const patient = await db.patient.findFirst({
    where: { id: patientId, clinicId: context.clinicId, archivedAt: null },
    select: { id: true, patientNo: true, firstName: true, lastName: true, dateOfBirth: true, phone: true, email: true, address: true, notes: true },
  });

  if (patient) {
    await recordAuditEvent(context, {
      action: "PATIENT_VIEWED",
      entityType: "Patient",
      entityId: patient.id,
    });
  }

  return patient;
}

export type CreatePatientInput = {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export async function createPatient(context: AuthContext, input: CreatePatientInput) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) throw new Error("PATIENT_NAME_REQUIRED");
  const patientNo = createPatientNumber();

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const patient = await tx.patient.create({
      data: {
        clinicId: context.clinicId,
        patientNo,
        firstName,
        lastName,
        dateOfBirth: input.dateOfBirth ?? null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });

    await recordAuditEvent(context, {
      action: "PATIENT_CREATED",
      entityType: "Patient",
      entityId: patient.id,
      metadata: { patientNo: patient.patientNo },
    }, tx);
    await recordSyncChange(tx, {
      clinicId: context.clinicId,
      entityType: "Patient",
      entityId: patient.id,
      operationType: "CREATE",
      payload: {
        id: patient.id,
        patientNo: patient.patientNo,
        firstName: patient.firstName,
        lastName: patient.lastName,
        dateOfBirth: patient.dateOfBirth?.toISOString() ?? null,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        notes: patient.notes,
        archivedAt: patient.archivedAt,
      } as Prisma.InputJsonValue,
    });

    return patient;
  });
}

export async function updatePatient(context: AuthContext, patientId: string, input: CreatePatientInput) {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) throw new Error("PATIENT_NAME_REQUIRED");

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const patient = await tx.patient.findFirst({ where: { id: patientId, clinicId: context.clinicId, archivedAt: null }, select: { id: true, patientNo: true } });
    if (!patient) throw new Error("PATIENT_NOT_FOUND");

    const updated = await tx.patient.update({
      where: { id: patient.id },
      data: {
        firstName,
        lastName,
        dateOfBirth: input.dateOfBirth ?? null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
      },
    });

    await recordAuditEvent(context, {
      action: "PATIENT_UPDATED",
      entityType: "Patient",
      entityId: patient.id,
      metadata: { patientNo: patient.patientNo },
    }, tx);
    await recordSyncChange(tx, {
      clinicId: context.clinicId,
      entityType: "Patient",
      entityId: updated.id,
      operationType: "UPDATE",
      payload: {
        id: updated.id,
        patientNo: updated.patientNo,
        firstName: updated.firstName,
        lastName: updated.lastName,
        dateOfBirth: updated.dateOfBirth?.toISOString() ?? null,
        phone: updated.phone,
        email: updated.email,
        address: updated.address,
        notes: updated.notes,
        archivedAt: updated.archivedAt,
      } as Prisma.InputJsonValue,
    });

    return updated;
  });
}
