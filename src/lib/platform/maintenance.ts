import "server-only";

import { db } from "@/lib/db";

export async function getActiveMaintenanceWindow(now = new Date()) {
  return db.maintenanceWindow.findFirst({
    where: {
      status: "ACTIVE",
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { startsAt: "desc" },
  });
}

export async function isMaintenanceActive(now = new Date()) {
  return !!(await getActiveMaintenanceWindow(now));
}

export async function requirePlatformAvailable(now = new Date()) {
  const maintenance = await getActiveMaintenanceWindow(now);
  if (maintenance) {
    throw new Error("PLATFORM_MAINTENANCE");
  }
}
