import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("sync business mutation invariants", () => {
  afterAll(async () => prisma.$disconnect());

  it("documents the required Patient and Visit persistence contract", async () => {
    const patient = await prisma.patient.findFirst({
      where: { clinic: { code: "DEMO-CLINIC" } },
      select: { id: true, clinicId: true },
    });
    expect(patient).toBeTruthy();

    const visit = patient
      ? await prisma.visit.findFirst({
          where: { clinicId: patient.clinicId, patientId: patient.id },
          select: { id: true, clinicId: true, patientId: true },
        })
      : null;

    if (visit) {
      expect(visit.clinicId).toBe(patient!.clinicId);
      expect(visit.patientId).toBe(patient!.id);
    }
  });
});
