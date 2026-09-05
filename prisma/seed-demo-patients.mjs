import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_PATIENTS = [
  ["P-DEMO-0001", "Amina", "Njoroge", "1992-04-18", "0712345001"],
  ["P-DEMO-0002", "Brian", "Mwangi", "1987-09-03", "0723456002"],
  ["P-DEMO-0003", "Cynthia", "Wambui", "2001-02-11", "0734567003"],
  ["P-DEMO-0004", "David", "Kamau", "1979-12-27", "0745678004"],
  ["P-DEMO-0005", "Esther", "Wanjiku", "1996-06-30", "0756789005"],
];

/**
 * Seeds deterministic demo patients for local/preview testing.
 *
 * Fixed patient numbers make this operation idempotent: rerunning it updates
 * only these known demo records and never creates duplicate patients.
 */
async function main() {
  const clinic = await prisma.clinic.findUnique({ where: { code: "DEMO-CLINIC" } });
  if (!clinic) throw new Error("DEMO_CLINIC_NOT_FOUND");

  for (const [patientNo, firstName, lastName, dateOfBirth, phone] of DEMO_PATIENTS) {
    await prisma.patient.upsert({
      where: { clinicId_patientNo: { clinicId: clinic.id, patientNo } },
      update: {
        firstName,
        lastName,
        dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`),
        phone,
        email: `${patientNo.toLowerCase()}@example.test`,
        address: "Demo Clinic area",
        notes: "Demo record for CMS testing.",
        archivedAt: null,
      },
      create: {
        clinicId: clinic.id,
        patientNo,
        firstName,
        lastName,
        dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`),
        phone,
        email: `${patientNo.toLowerCase()}@example.test`,
        address: "Demo Clinic area",
        notes: "Demo record for CMS testing.",
      },
    });
  }

  console.log(`Seeded ${DEMO_PATIENTS.length} demo patients.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
