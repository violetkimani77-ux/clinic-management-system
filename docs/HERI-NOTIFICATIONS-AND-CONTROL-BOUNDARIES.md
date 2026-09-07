# Heri CMS — Notifications & Control Boundaries

## Purpose

Define the boundary between the live clinic dashboard, clinic notifications, and the Heri platform control panel before implementation begins.

## Product rule

- **Dashboard:** answers **what is happening now?** Live operational statistics and current state derived from clinic records.
- **Notifications:** answer **what needs my attention?** Curated, role-aware events that require review or action.
- **Heri Platform Control:** answers **what is happening across Heri itself?** Platform operations, tenant lifecycle, subscription, datastore, residency, security and infrastructure events.

These surfaces may share event/data infrastructure, but they must not become duplicate screens or share authorization boundaries accidentally.

## Clinic notification audience

### Clinic administrators

Notify only for important administrative/workflow exceptions, such as:
- New staff account requiring approval or action.
- Important pharmacy exceptions.
- Important accounts/finance exceptions.
- Security/account events requiring administrator attention.
- Workflow failures or exceptions that materially affect clinic operations.

### Pharmacy users

Notify for actionable pharmacy events, such as:
- Medicine at or below reorder level.
- Medicine batch approaching expiry.
- Expired stock requiring action.
- Prescription/dispensing exception.
- Stock discrepancy or failed stock operation.

### Accounts/finance users

Notify for actionable financial events, such as:
- Overdue or materially outstanding invoices.
- Payment/reconciliation exception.
- Failed or incomplete transaction.
- Unallocated/duplicate payment reference issue.
- Billing item requiring review.

## What should not become a notification

Normal live metrics should remain dashboard data unless an explicit threshold/event makes them actionable. Examples:
- Patients today.
- Visits today.
- Revenue collected today.
- Current outstanding balance as a raw number.
- Current pharmacy stock count as a raw number.

The dashboard may expose these metrics and an attention summary; the notification center should not merely repeat every metric.

## Platform control-panel notifications

Platform-level notifications belong to Heri platform operators, not ordinary clinic users. Examples:
- Trial lifecycle events requiring platform action.
- Subscription/account lifecycle exceptions.
- Tenant datastore health/provisioning failures.
- Residency validation failures.
- Backup/DR or platform health failures.
- Platform security events.
- Failed migrations/provisioning jobs.

The platform control panel must not be used as the mechanism for sending ordinary clinic pharmacy/accounts notifications. A shared event/notification service may feed both surfaces, but audience and authorization must remain distinct.

## Notification behavior

Initial implementation should be **in-app** and deliberately small:
- unread/read state;
- notification history;
- severity: informational, attention required, critical;
- direct link to the relevant clinic workflow/record;
- role/permission-aware delivery;
- auditability for important events;
- deliberate event catalog rather than automatic alerts for every data change.

Email/SMS/push delivery is a later channel layer, not a prerequisite for the initial in-app notification center.

## Current code audit findings

The existing clinic dashboard is already a live operational surface. `app/dashboard/page.tsx` reads database-backed metrics on each request and currently exposes an inline **Needs attention** section for low stock, expiry, expired stock and outstanding balances. That section links to Pharmacy or Accounts rather than acting as a persistent notification center.

The Pharmacy workspace is substantially established: it reads clinic-scoped prescriptions, stock and expiry data; supports dispensing; uses FEFO stock allocation; creates pharmacy charges/invoice items; and records a dispensing audit event inside a transaction.

The Accounts workspace is substantially established: it reads clinic-scoped invoices/payments, creates invoices, records verified payments, prevents duplicate external payment references, updates invoice status, and records payment audit events inside a serializable transaction.

The role model already distinguishes `ADMIN`, `PHARMACY`, and `ACCOUNTS` permissions. Sessions are clinic-membership scoped and derive permissions from the membership role. This provides a foundation for role-aware notifications.

However, there is no clear persistent notification subsystem surfaced by repository search, and the current dashboard attention list is not a notification history/unread system. A notification feature therefore should be built as a new layer rather than duplicating the existing live metrics.

## Remaining audit gates

- Verify the full pharmacy UI/actions/tests and stock-management paths end-to-end.
- Verify the full accounts UI/actions/tests, reconciliation behavior and financial edge cases end-to-end.
- Verify staff/user lifecycle management UI, activation/deactivation, role assignment and auditability.
- Define the notification event catalog and role routing before implementing persistence/UI.
- Define platform-control notification events separately from clinic notification events.
- Verify all notification queries and actions are clinic-scoped for clinic users and platform-scoped only for explicitly authorized platform operators.
