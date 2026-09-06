-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('CLINICAL_CARE');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('CONSENTED', 'REFUSED', 'NOT_REQUIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ConsentMethod" AS ENUM ('VERBAL', 'WRITTEN', 'ELECTRONIC', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "PatientConsent" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "status" "ConsentStatus" NOT NULL,
    "method" "ConsentMethod" NOT NULL,
    "consentVersion" TEXT,
    "obtainedAt" TIMESTAMP(3),
    "withdrawnAt" TIMESTAMP(3),
    "recordedById" TEXT,
    "representativeName" TEXT,
    "representativeRelationship" TEXT,
    "exceptionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientConsent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientConsent_clinicId_patientId_idx" ON "PatientConsent"("clinicId", "patientId");

-- CreateIndex
CREATE INDEX "PatientConsent_patientId_purpose_createdAt_idx" ON "PatientConsent"("patientId", "purpose", "createdAt");

-- AddForeignKey
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientConsent" ADD CONSTRAINT "PatientConsent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
