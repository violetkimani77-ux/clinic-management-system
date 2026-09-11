# Production E2E Readiness Plan

This plan validates the clinic's critical workflows without merging anything into `main`.

## Scope

- Authentication and session lifecycle
- Tenant isolation and role authorization
- Patient creation and retrieval
- Visit creation and retrieval
- Prescription and pharmacy workflow
- Billing/audit trail integrity
- Offline sync replay, conflicts, retries and idempotency
- Error and recovery paths

## Acceptance criteria

A workflow is considered verified only when the test passes against a production-like database/configuration and demonstrates both the happy path and the relevant authorization/error path.

### Authentication

- [x] Staff can sign in with valid credentials.
- [x] Invalid credentials are rejected without revealing account details.
- [x] An unauthenticated user cannot access protected routes.
- [x] Expired/revoked sessions cannot continue accessing protected data.

### Tenant isolation

- [x] A user can access records belonging to their clinic.
- [x] A user cannot read another clinic's patient/visit/pharmacy records.
- [x] A user cannot mutate another clinic's records by changing IDs in requests.
- [x] Server-side authorization remains enforced when UI restrictions are bypassed.

### Clinical workflow

- [x] Create a patient and verify it is persisted.
- [x] Open the patient from the patient list/search flow.
- [x] Create a visit for that patient and verify persistence.
- [x] Create/update a prescription and verify the clinical state transition.
- [x] Verify sensitive operations produce the expected audit event.

### Pharmacy and billing

- [ ] Dispense available stock successfully.
- [ ] Partial dispensing preserves remaining quantity/state.
- [ ] Insufficient or expired stock is rejected safely.
- [ ] A return/disposal operation updates stock and history correctly.
- [ ] Dispensing is linked to billing/audit records where expected.

### Offline sync

- [ ] A valid Patient mutation is applied once.
- [ ] A valid Visit mutation is applied once.
- [ ] Replaying the same operation is idempotent.
- [ ] A stale expected version produces a conflict without corrupting data.
- [x] Invalid client timestamps are rejected before persistence.
- [x] Cross-tenant/device/user sync operations are rejected.
- [x] A transient failure can be retried without duplicate domain mutations.

## Evidence required before checklist completion

- Passing Playwright run output.
- No failing tests or known flaky tests in the covered workflows.
- Test data/setup is deterministic and isolated from real production data.
- Production-like environment variables are used without exposing secrets in source or test artifacts.
- Any discovered defects are fixed and re-tested before the corresponding production-readiness checklist item is marked complete.

## Branch policy

This work lives on `feat/production-e2e-readiness`. Do not merge to `main` as part of this task.
