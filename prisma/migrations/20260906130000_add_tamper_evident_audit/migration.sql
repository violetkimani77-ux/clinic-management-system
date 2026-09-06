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

CREATE OR REPLACE FUNCTION "computeAuditEntryHash"(
  p_id TEXT,
  p_clinic_id TEXT,
  p_user_id TEXT,
  p_sequence INTEGER,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_metadata JSONB,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_previous_hash TEXT,
  p_created_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT encode(
    digest(
      jsonb_build_object(
        'action', p_action,
        'clinicId', p_clinic_id,
        'createdAt', to_char(p_created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'entityId', p_entity_id,
        'entityType', p_entity_type,
        'id', p_id,
        'ipAddress', p_ip_address,
        'metadata', p_metadata,
        'previousHash', p_previous_hash,
        'sequence', p_sequence,
        'userAgent', p_user_agent,
        'userId', p_user_id
      )::text,
      'sha256'
    ),
    'hex'
  )
$$;

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

      calculated_hash := "computeAuditEntryHash"(
        audit_row."id",
        audit_row."clinicId",
        audit_row."userId",
        current_sequence,
        audit_row."action",
        audit_row."entityType",
        audit_row."entityId",
        audit_row."metadata",
        audit_row."ipAddress",
        audit_row."userAgent",
        previous_hash,
        audit_row."createdAt"
      );

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
