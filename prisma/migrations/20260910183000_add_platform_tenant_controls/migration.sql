CREATE TABLE "PlatformTenantControl" (
  "clinicId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "suspensionReason" TEXT,
  "suspendedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformTenantControl_pkey" PRIMARY KEY ("clinicId"),
  CONSTRAINT "PlatformTenantControl_status_check" CHECK ("status" IN ('ACTIVE','SUSPENDED')),
  CONSTRAINT "PlatformTenantControl_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "PlatformTenantControl_status_idx" ON "PlatformTenantControl"("status");

CREATE OR REPLACE FUNCTION prevent_platform_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Platform audit evidence is immutable';
END;
$$;

CREATE TRIGGER "PlatformAuditLog_immutable"
BEFORE UPDATE OR DELETE ON "PlatformAuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_platform_audit_mutation();