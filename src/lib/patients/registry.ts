import "server-only";

import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/authorization";

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

/** Builds a human-readable patient number with a clinic-scoped unique guard. */
function createPatientNumber(): string {
  const date = new Date();
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("");
  const suffix = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return `P-${day}-${suffix}`;
}

/** Searches only active patients belonging to the authenticated clinic. */
export async function searchPatients(context: AuthContext, query = ""): Promise<PatientSearchResult[]> {
  const normalizedQuery = query.trim();
  return db.patient.findMany({
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
}

/** Loads only the registry fields needed by the patient profile page. */
export async function getPatientProfile(context: AuthContext, patientId: string): Promise<PatientProfile | null> {
  return db.patient.findFirst({
    where: { id: patientId, clinicId: context.clinicId, archivedAt: null },
    select: { id: true, patientNo: true, firstName: true, lastName: true, dateOfBirth: true, phone: true, email: true, address: true, notes: true },
  });
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

/** Creates a patient and its audit event atomically within the active clinic. */
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
    await tx.auditLog.create({
      data: { clinicId: context.clinicId, userId: context.userId, action: "PATIENT_CREATED", entityType: "Patient", entityId: patient.id, metadata: { patientNo: patient.patientNo } },
    });
    return patient;
  });
}

/**
 * Updates registry data only when the patient belongs to the active clinic.
 *
 * The operation records who made the change; important clinical history is
 * intentionally not overwritten here because those workflows will have their
 * own immutable/audited records.
 */
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

    await tx.auditLog.create({
      data: { clinicId: context.clinicId, userId: context.userId, action: "PATIENT_UPDATED", entityType: "Patient", entityId: patient.id, metadata: { patientNo: patient.patientNo } },
    });
    return updated;
  });
}
