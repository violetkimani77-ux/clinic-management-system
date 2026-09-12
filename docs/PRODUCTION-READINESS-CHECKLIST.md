# Heri CMS — Production Readiness Checklist

**Product:** Heri CMS / HeriCMS — Clinic Management System  
**Branch:** `feat/production-e2e-readiness`  
**Rule:** `main` remains unchanged until explicit approval.  
**Naming:** Heri CMS / HeriCMS only.

## Status legend
- [x] Complete with implementation and/or automated evidence
- [~] Implemented/covered, but final external or fresh-run evidence is still required
- [ ] Blocked on production access, infrastructure evidence, legal approval, or a fresh CI/release run

## Current evidence matrix

| Task | Status | Current evidence / remaining gate |
| --- | --- | --- |
| Platform Control E2E | [~] | Dedicated login, TOTP, privileged-route traversal, tenant-detail/residency checks and ephemeral CI credentials are implemented; fresh CI execution remains. |
| Provisioning/lifecycle E2E | [~] | Tenant datastore lifecycle fields and provisioned/health-checked evidence are exercised; real provisioning lifecycle automation is not yet available in the control panel. |
| Maintenance/suspension E2E | [~] | Server-side suspension enforcement exists and protected-route coverage exists; a complete UI-driven maintenance/suspension workflow is still required. |
| Residency/datastore E2E | [~] | Fail-closed Kenya-only datastore guard plus E2E verification of `KENYA_ONLY` / `KE` primary+backup evidence are implemented; real provider geography evidence remains. |
| Production infrastructure verification | [ ] | Production DB, migrations, secrets/configuration, backups/DR, domain, provider geography and restore/rollback require production access/evidence. |
| Accessibility/responsive/performance verification | [~] | Desktop/mobile/tablet Playwright projects, narrow-viewport overflow checks, semantic landmarks and security-header checks are covered; full WCAG/performance audit remains. |
| Final legal/public-site QA | [~] | Heri branding, metadata, public link audit and public smoke coverage are implemented; legal/commercial approval remains external. |
| Final release candidate | [ ] | Requires fresh green CI, final Preview verification, production smoke test and release sign-off. |

## P0 — Core production safety

### Authentication, authorization and tenant isolation
- [x] Password hashing and login rate limiting
- [x] RBAC and entitlement enforcement
- [x] Suspended/disabled users rejected server-side
- [x] Session expiry/revocation and clinic membership binding
- [x] Tenant-aware datastore guard / fail-closed tenant assertion
- [x] Protected patient-data and session lifecycle E2E coverage
- [~] Cross-tenant authorization E2E coverage
- [~] Full authorization matrix E2E coverage across modules/actions
- [~] MFA E2E verification and production enforcement evidence
- [x] Secure cookie attributes and session rotation/revocation implementation

### Clinical / operational workflows
- [x] Patient, visit, prescription and pharmacy workflows
- [x] Partial dispensing / cumulative FEFO
- [x] Insufficient and expired stock rejection
- [x] Stock return/disposal and error paths
- [x] Billing ↔ dispensing ↔ audit linkage
- [x] Sensitive operations produce audit evidence

### Offline synchronization
- [x] Business mutation dispatcher and idempotent replay handling
- [x] Optimistic version conflict handling
- [x] Invalid timestamp / cross-tenant / device / user rejection
- [x] Retry without duplicate mutation
- [x] Sync business-mutation E2E coverage
- [~] Production-scale pull/change-cursor strategy and operational conflict monitoring

### Secrets and application security
- [x] Repository secret scan in CI
- [x] No tracked credential environment files / no identified client-side secrets
- [x] Server-side database secret usage
- [x] Production response security headers/CSP implemented
- [~] `npm audit --audit-level=high` added to CI; fresh result pending
- [~] CodeQL analysis workflow added; fresh result pending
- [~] XSS/file/link abuse review is covered by public link/header tests but needs broader independent review
- [ ] Independent security assessment according to launch risk

## P0 — Platform Control Panel

### Boundary and architecture
- [x] Dedicated Platform Control authentication
- [x] Mandatory TOTP MFA
- [x] Separate administrator/operator/auditor RBAC
- [x] Session expiry, idle timeout, rotation and revocation
- [x] Platform login rate limiting
- [x] Privileged audit logging and database-level audit immutability
- [x] Tenant operational directory/detail
- [x] Tenant suspension enforcement against clinic sessions
- [x] Fail-closed datastore/residency guard
- [x] Clinical/patient-registry data excluded from Platform Control views

### Platform release tests
- [~] Platform-admin login/MFA E2E
- [~] Platform authorization matrix E2E
- [~] Cross-tenant denial E2E
- [~] Provisioning/residency datastore E2E evidence
- [~] Maintenance/suspension authorization E2E
- [~] Audit completeness/high-risk confirmation E2E
- [~] Sensitive-data minimization/no-secret-leak tests
- [~] Responsive/accessibility verification

## P0 — Production infrastructure

- [ ] Production Prisma migrations applied successfully against real production DB
- [ ] Production DB connection verified
- [ ] Required production environment variables verified
- [ ] No development/test credentials in production
- [ ] Production domain/aliases verified
- [ ] Production DB geography verified
- [ ] Backup/DR geography verified
- [ ] Provider/subprocessor geography verified
- [ ] Backups enabled and restore tested
- [ ] Rollback/runbook tested
- [~] Application/datastore/background-job health monitoring active
- [~] Authentication/security alerts active
- [~] Backup/migration/provisioning failure alerts active
- [ ] Incident-response drill completed

## P1 — Privacy, legal and compliance

- [~] Final legal/public-site QA
- [ ] Actual production DB/backup/provider residency evidence verified
- [ ] Transfer-assessment workflow verified
- [ ] Retention/deletion/breach/legal-request procedures verified
- [ ] DPA/provider contractual safeguards verified
- [ ] Cookie/analytics behavior documented and privacy-approved

## P1 — SEO, public experience and branding

- [x] Heri CMS branding
- [x] Heri CMS OpenGraph/social metadata
- [x] Premium landing/dashboard showcase integration
- [~] Canonical-domain/metadata verification on final production domain
- [~] Social preview verification
- [x] Public internal-link audit coverage
- [~] Responsive landing-page verification
- [~] Accessibility/contrast/keyboard/screen-reader audit
- [~] Image optimization / modern-format verification

## P1 — Application QA

- [x] Custom 404 implementation
- [x] Public internal link audit automation
- [x] Form validation/error-state coverage on authentication surface
- [ ] Spam protection on public forms
- [~] Responsive QA across mobile/tablet/desktop
- [~] Core Web Vitals/performance verification
- [~] Accessibility keyboard/focus/screen-reader verification

## CI / release automation now in place

- [x] Secret scanning in CI
- [x] High-severity dependency audit in CI
- [x] CodeQL workflow
- [x] Ephemeral Platform Control E2E credentials generated inside CI
- [x] Isolated Postgres + Prisma migration/seed before E2E
- [x] Playwright desktop/mobile/tablet projects
- [x] Public-site metadata/security-header/link/viewport tests
- [x] Platform login/MFA, privileged-route, authorization-matrix and residency/provisioning tests
- [x] Existing pharmacy, offline-sync, tenant-isolation and protected-workflow coverage retained

## Release gate

The branch is **not release-approved** until the following external evidence is real and current:

- [ ] Fresh CI green on final branch head, including E2E, dependency audit and CodeQL
- [ ] Final Vercel Preview verified on final branch head
- [ ] Production DB/migrations/secrets/backups/restore evidence complete
- [ ] Production/provider residency evidence complete
- [ ] Maintenance/suspension workflow evidence complete
- [ ] Privacy/legal/DPA/retention/breach approvals complete
- [ ] Full accessibility and performance audit complete
- [ ] Production smoke test complete
- [ ] Explicit user approval received before merging `main`

> **Branch discipline:** All work in this update is scoped to `feat/production-e2e-readiness`. `main` has not been modified or merged as part of this work.
