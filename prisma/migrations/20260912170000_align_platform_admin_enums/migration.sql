-- The original Platform Control migration used TEXT columns with CHECK constraints,
-- while Prisma models these fields as PostgreSQL enums. Preserve existing values and
-- make the physical schema match the Prisma schema so fresh and upgraded databases
-- behave identically.

CREATE TYPE "PlatformAdminStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');
CREATE TYPE "PlatformAdminRole" AS ENUM ('PLATFORM_ADMIN', 'PLATFORM_OPERATOR', 'PLATFORM_AUDITOR');

ALTER TABLE "PlatformAdmin"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "PlatformAdminStatus" USING "status"::"PlatformAdminStatus",
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
  ALTER COLUMN "roleCode" DROP DEFAULT,
  ALTER COLUMN "roleCode" TYPE "PlatformAdminRole" USING "roleCode"::"PlatformAdminRole",
  ALTER COLUMN "roleCode" SET DEFAULT 'PLATFORM_ADMIN';

ALTER TABLE "PlatformAdmin"
  DROP CONSTRAINT "PlatformAdmin_status_check",
  DROP CONSTRAINT "PlatformAdmin_roleCode_check";
