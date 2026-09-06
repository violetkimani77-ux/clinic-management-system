CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE "AuditSequence" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "currentSequence" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditSequence_clinicId_key" ON "AuditSequence"("clinicId");

ALTER TABLE "AuditLog"
ADD COLUMN "sequence" INTEGER,
ADD COLUMN "previousHash" TEXT,
ADD COLUMN "entryHash" TEXT;

INSERT INTO "AuditSequence" ("id", "clinicId")
SELECT gen_random_uuid()::text, "id"
FROM "Clinic"
ON CONFLICT ("clinicId") DO NOTHING;

DO $$
DECLARE
  clinic_row RECORD;
  audit_row RECORD;
  current_sequence INTEGER;
  previous_hash TEXT;
  payload JSONB;
  calculated_hash TEXT;
BEGIN
  FOR clinic_row IN SELECT "id" AS clinic_id FROM "Clinic" LOOP
    current_sequence := 0;
    previous_hash := NULL;

    FOR audit_row IN
      SELECT "id", "clinicId", "userId", "action", "entityType", "entityId", "metadata",
             "ipAddress", "userAgent", "createdAt"
      FROM "AuditLog"
      WHERE "clinicId" = clinic_row.clinic_id
      ORDER BY "createdAt" ASC, "id" ASC
    LOOP
      current_sequence := current_sequence + 1;

      payload := jsonb_build_object(
        'action', audit_row."action",
        'clinicId', audit_row."clinicId",
        'createdAt', to_char(audit_row."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'entityId', audit_row."entityId",
        'entityType', audit_row."entityType",
        'id', audit_row."id",
        'ipAddress', audit_row."ipAddress",
        'metadata', audit_row."metadata",
        'previousHash', previous_hash,
        'sequence', current_sequence,
        'userAgent', audit_row."userAgent",
        'userId', audit_row."userId"
      );

      calculated_hash := encode(digest(payload::text, 'sha256'), 'hex');

      UPDATE "AuditLog"
      SET "sequence" = current_sequence,
          "previousHash" = previous_hash,
          "entryHash" = calculated_hash
      WHERE "id" = audit_row."id";

      previous_hash := calculated_hash;
    END LOOP;

    UPDATE "AuditSequence"
    SET "currentSequence" = current_sequence,
        "updatedAt" = CURRENT_TIMESTAMP
    WHERE "clinicId" = clinic_row.clinic_id;
  END LOOP;
END $$;

ALTER TABLE "AuditLog"
ALTER COLUMN "sequence" SET NOT NULL,
ALTER COLUMN "entryHash" SET NOT NULL;

CREATE UNIQUE INDEX "AuditLog_clinicId_sequence_key" ON "AuditLog"("clinicId", "sequence");

ALTER TABLE "AuditSequence"
ADD CONSTRAINT "AuditSequence_clinicId_fkey"
FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
