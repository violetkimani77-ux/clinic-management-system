import "server-only";

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { AuthContext } from "@/lib/auth/authorization";

export type AuditEventInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

/**
 * Records an append-only application audit event inside the active clinic.
 * Call this for both mutations and access to protected health information.
 */
export async function recordAuditEvent(
  context: AuthContext,
  event: AuditEventInput,
): Promise<void> {
  await db.auditLog.create({
    data: {
      clinicId: context.clinicId,
      userId: context.userId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      metadata: event.metadata ?? undefined,
    },
  });
}
