CREATE TABLE "ClinicInvitation" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClinicInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClinicInvitation_tokenHash_key" ON "ClinicInvitation"("tokenHash");
CREATE INDEX "ClinicInvitation_clinicId_roleId_acceptedAt_idx" ON "ClinicInvitation"("clinicId", "roleId", "acceptedAt");
CREATE INDEX "ClinicInvitation_email_clinicId_idx" ON "ClinicInvitation"("email", "clinicId");
CREATE INDEX "ClinicInvitation_expiresAt_idx" ON "ClinicInvitation"("expiresAt");
ALTER TABLE "ClinicInvitation" ADD CONSTRAINT "ClinicInvitation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClinicInvitation" ADD CONSTRAINT "ClinicInvitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
