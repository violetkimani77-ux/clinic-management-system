-- The original Platform Control migration used TEXT columns with CHECK constraints,
-- while Prisma models these fields as PostgreSQL enums. Preserve existing values and
-- make the physical schema match the Prisma schema so fresh and upgraded databases
-- behave identically.

CREATE TYPE "PlatformAdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');
CREATE TYPE "PlatformAdminRole" AS ENUM ('PLATFORM_ADMIN', 'PLATFORM_OPERATOR', 'PLATFORM_AUDITOR');

-- PostgreSQL must not retain the TEXT check expressions while the columns are being
-- converted to enum types; otherwise the constraint expression cannot be rebound.
ALTER TABLE "PlatformAdmin"
  DROP CONSTRAINT "PlatformAdmin_status_check",
  DROP CONSTRAINT "PlatformAdmin_roleCode_check",
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "roleCode" DROP DEFAULT;

ALTER TABLE "PlatformAdmin"
  ALTER COLUMN "status" TYPE "PlatformAdminStatus" USING "status"::"PlatformAdminStatus",
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
  ALTER COLUMN "roleCode" TYPE "PlatformAdminRole" USING "roleCode"::"PlatformAdminRole",
  ALTER COLUMN "roleCode" SET DEFAULT 'PLATFORM_ADMIN';
