import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;
const prisma = new PrismaClient();

function requireStaffCredentials() {
  if (staffEmail && staffPassword) return;
  if (process.env.CI) {
    throw new Error("E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD must be configured in CI for sync tests.");
  }
  test.skip(true, "Set E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD for sync tests.");
}

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(staffEmail!);
  await page.getByRole("textbox", { name: "Password" }).fill(staffPassword!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function getSyncContext() {
  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { code: "DEMO-CLINIC" },
    select: { id: true },
  });
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: staffEmail! },
    select: { id: true },
  });
  const deviceId = `e2e-sync-${user.id}`;
  await prisma.device.upsert({
    where: { clinicId_deviceId: { clinicId: clinic.id, deviceId } },
    update: { userId: user.id, status: "ACTIVE", name: "E2E Sync Device", expiresAt: null },
    create: { clinicId: clinic.id, userId: user.id, deviceId, name: "E2E Sync Device", status: "ACTIVE" },
  });
  return { clinicId: clinic.id, userId: user.id, deviceId };
}

function operation({
  operationId,
  clinicId,
  deviceId,
  userId,
  entityType,
  entityId,
  payload,
  expectedVersion,
}: {
  operationId: string;
  clinicId: string;
  deviceId: string;
  userId: string;
  entityType: "Patient" | "Visit";
  entityId: string;
  payload: Record<string, unknown>;
  expectedVersion?: number;
}) {
  return {
    protocolVersion: 1,
    operationId,
    clinicId,
    deviceId,
    userId,
    entityType,
    entityId,
    operationType: "CREATE" as const,
    payload,
    clientCreatedAt: new Date().toISOString(),
    ...(expectedVersion === undefined ? {} : { expectedVersion }),
  };
}

test.describe("offline sync business mutations", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("applies a valid Patient mutation and replays the same operation idempotently", async ({ page }) => {
    requireStaffCredentials();
    await signIn(page);
    const context = await getSyncContext();
    const uniqueId = Date.now().toString();
    const patientId = randomUUID();
    const operationId = randomUUID();
    const payload = {
      patientNo: `E2E-SYNC-${uniqueId}`,
      firstName: "Sync",
      lastName: "Patient",
      phone: "0712345678",
      email: "SYNC@EXAMPLE.COM",
      notes: "Created by offline sync E2E",
    };

    const requestBody = {
      protocolVersion: 1,
      clinicId: context.clinicId,
      deviceId: context.deviceId,
      operations: [operation({ operationId, clinicId: context.clinicId, deviceId: context.deviceId, userId: context.userId, entityType: "Patient", entityId: patientId, payload })],
    };

    const firstResponse = await page.request.post("/api/sync/push", { data: requestBody });
    expect(firstResponse.status()).toBe(200);
    const firstBody = await firstResponse.json();
    expect(firstBody.results).toHaveLength(1);
    expect(firstBody.results[0]).toMatchObject({ operationId, status: "PROCESSED", entityVersion: 1 });

    const persisted = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, clinicId: true, patientNo: true, firstName: true, lastName: true, phone: true, email: true, notes: true },
    });
    expect(persisted).toEqual({
      id: patientId,
      clinicId: context.clinicId,
      patientNo: payload.patientNo,
      firstName: "Sync",
      lastName: "Patient",
      phone: payload.phone,
      email: "sync@example.com",
      notes: payload.notes,
    });

    const replayResponse = await page.request.post("/api/sync/push", { data: requestBody });
    expect(replayResponse.status()).toBe(200);
    const replayBody = await replayResponse.json();
    expect(replayBody.results[0]).toEqual(firstBody.results[0]);

    const [patientCount, changeCount, operationRecord] = await Promise.all([
      prisma.patient.count({ where: { id: patientId } }),
      prisma.syncChange.count({ where: { operationId } }),
      prisma.syncOperation.findUnique({ where: { operationId }, select: { status: true, entityVersion: true } }),
    ]);
    expect(patientCount).toBe(1);
    expect(changeCount).toBe(1);
    expect(operationRecord).toEqual({ status: "PROCESSED", entityVersion: 1 });
  });

  test("rejects a stale expected version without applying the mutation", async ({ page }) => {
    requireStaffCredentials();
    await signIn(page);
    const context = await getSyncContext();
    const uniqueId = Date.now().toString();
    const patientId = randomUUID();
    const initialOperationId = randomUUID();
    const initialPayload = {
      patientNo: `E2E-SYNC-CONFLICT-${uniqueId}`,
      firstName: "Conflict",
      lastName: "Patient",
      notes: "Initial synced state",
    };

    const initialResponse = await page.request.post("/api/sync/push", {
      data: {
        protocolVersion: 1,
        clinicId: context.clinicId,
        deviceId: context.deviceId,
        operations: [operation({ operationId: initialOperationId, clinicId: context.clinicId, deviceId: context.deviceId, userId: context.userId, entityType: "Patient", entityId: patientId, payload: initialPayload })],
      },
    });
    expect(initialResponse.status()).toBe(200);
    expect((await initialResponse.json()).results[0]).toMatchObject({ status: "PROCESSED", entityVersion: 1 });

    const staleOperationId = randomUUID();
    const stalePayload = {
      patientNo: initialPayload.patientNo,
      firstName: "Should",
      lastName: "Not Apply",
      notes: "Stale client mutation",
    };
    const staleResponse = await page.request.post("/api/sync/push", {
      data: {
        protocolVersion: 1,
        clinicId: context.clinicId,
        deviceId: context.deviceId,
        operations: [operation({ operationId: staleOperationId, clinicId: context.clinicId, deviceId: context.deviceId, userId: context.userId, entityType: "Patient", entityId: patientId, payload: stalePayload, expectedVersion: 0 })],
      },
    });

    expect(staleResponse.status()).toBe(200);
    const staleBody = await staleResponse.json();
    expect(staleBody.results[0]).toMatchObject({
      operationId: staleOperationId,
      status: "CONFLICT",
      entityVersion: 1,
      errorCode: "SYNC_VERSION_CONFLICT",
    });

    const [patient, changeCount, operationRecord, conflicts] = await Promise.all([
      prisma.patient.findUnique({ where: { id: patientId }, select: { firstName: true, lastName: true, notes: true } }),
      prisma.syncChange.count({ where: { entityId: patientId } }),
      prisma.syncOperation.findUnique({ where: { operationId: staleOperationId }, select: { status: true, entityVersion: true, errorCode: true } }),
      prisma.syncConflict.findMany({
        where: { operationId: staleOperationId },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { expectedVersion: true, actualVersion: true, clientPayload: true, serverPayload: true },
      }),
    ]);

    expect(patient).toEqual({ firstName: "Conflict", lastName: "Patient", notes: "Initial synced state" });
    expect(changeCount).toBe(1);
    expect(operationRecord).toEqual({ status: "CONFLICT", entityVersion: 1, errorCode: "SYNC_VERSION_CONFLICT" });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({
      expectedVersion: 0,
      actualVersion: 1,
      clientPayload: stalePayload,
      serverPayload: initialPayload,
    });
  });

  test("applies a valid Visit mutation to an existing clinic patient", async ({ page }) => {
    requireStaffCredentials();
    await signIn(page);
    const context = await getSyncContext();
    const uniqueId = Date.now().toString();
    const patient = await prisma.patient.create({
      data: {
        clinicId: context.clinicId,
        patientNo: `E2E-SYNC-VISIT-${uniqueId}`,
        firstName: "Sync",
        lastName: "Visit Patient",
      },
      select: { id: true },
    });
    const visitId = randomUUID();
    const operationId = randomUUID();
    const openedAt = new Date(Date.now() - 60_000).toISOString();
    const requestBody = {
      protocolVersion: 1,
      clinicId: context.clinicId,
      deviceId: context.deviceId,
      operations: [operation({
        operationId,
        clinicId: context.clinicId,
        deviceId: context.deviceId,
        userId: context.userId,
        entityType: "Visit",
        entityId: visitId,
        payload: { patientId: patient.id, status: "OPEN", openedAt, notes: "Created by offline sync E2E" },
      })],
    };

    const response = await page.request.post("/api/sync/push", { data: requestBody });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.results[0]).toMatchObject({ operationId, status: "PROCESSED", entityVersion: 1 });

    const persisted = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, clinicId: true, patientId: true, status: true, openedAt: true, notes: true },
    });
    expect(persisted).toEqual({
      id: visitId,
      clinicId: context.clinicId,
      patientId: patient.id,
      status: "OPEN",
      openedAt: new Date(openedAt),
      notes: "Created by offline sync E2E",
    });
  });
});
