# Heri CMS — Production Readiness Checklist

**Product:** Heri CMS / HeriCMS — Clinic Management System  
**Branch:** `feat/production-e2e-readiness`  
**Rule:** `main` remains unchanged until explicit approval.  
**Naming:** **Heri CMS / HeriCMS only.** Hali CMS is historical and must not appear in new product-facing work.

## Status legend
- [x] Done and supported by implementation/test evidence
- [~] In progress / partially implemented and requires completion or verification
- [ ] Not started or blocked on production evidence

## Current branch evidence matrix

| Task | Status | Evidence interpretation |
| --- | --- | --- |
| Platform Control E2E | 🟡 Partial | Dedicated authentication boundary and MFA surface are covered; the full privileged workflow is not yet exercised end-to-end. |
| Provisioning/lifecycle E2E | 🔴 Pending | Provisioning records and fail-closed guards exist; production lifecycle behavior still requires E2E evidence. |
| Maintenance/suspension E2E | 🟡 Partial | Suspension enforcement exists; full authorization and negative-path E2E evidence remains. |
| Residency/datastore E2E | 🟡 Partial | Kenya residency validation and fail-closed datastore guard exist; real infrastructure/geography evidence remains. |
| Production infrastructure verification | 🔴 Pending | Production DB, migrations, secrets/configuration, backups/DR, domain and restore/rollback still require verification. |
| Accessibility/responsive/performance verification | 🟡 Partial | Relevant responsive/accessibility implementation exists; final browser/device/performance verification remains. |
| Final legal/public-site QA | 🟡 Partial | Public product, OpenGraph/social metadata and branding are implemented; final commercial/legal approval and deployment QA remain. |
| Final release candidate | 🔴 Pending | Existing build/E2E evidence predates the latest tenant/platform changes; a fresh release-candidate validation is required. |

## P0 — Core production safety

### Authentication, authorization and tenant isolation
- [x] Password hashing and login rate limiting
- [x] RBAC and entitlement enforcement
- [x] Suspended/disabled users rejected server-side
- [x] Session expiry/revocation
- [x] Clinic membership binding during login
- [x] Tenant-aware datastore guard / fail-closed tenant assertion
- [~] Cross-tenant authorization E2E coverage
- [x] Protected patient-data access E2E coverage
- [x] Session lifecycle E2E coverage
- [~] Full authorization matrix across every module/action
- [~] MFA E2E verification and production enforcement evidence
- [x] Secure cookie attributes and session rotation/revocation implementation; final production verification remains

### Clinical / operational workflows
- [x] Patient persistence
- [x] Visit persistence
- [x] Prescription workflow
- [x] Pharmacy dispensing
- [x] Partial dispensing / cumulative FEFO
- [x] Insufficient and expired stock rejection
- [x] Stock return/disposal
- [x] Billing ↔ dispensing ↔ audit linkage
- [x] Sensitive operations produce audit evidence

### Offline synchronization
- [x] Patient/Visit business mutation dispatcher
- [x] Idempotent replay handling
- [x] Optimistic version conflict handling
- [x] Invalid client timestamp rejection
- [x] Cross-tenant/device/user rejection
- [x] Retry without duplicate mutation
- [x] Sync business-mutation E2E coverage
- [~] Production-scale offline pull/change-cursor strategy
- [~] Operational sync monitoring and conflict workflow

### Secrets and application security
- [x] Repository secret scan added to CI
- [x] No tracked environment files containing credentials
- [x] No `NEXT_PUBLIC_*` secret usage identified
- [x] Server-side database secret usage
- [ ] Production security headers/CSP verification
- [ ] Dependency vulnerability/SAST review
- [ ] XSS/file/link abuse review
- [ ] Independent security assessment according to launch risk

## P0 — Platform Control Panel

### Architecture / boundary
- [x] Dedicated Platform Control authentication
- [x] Mandatory TOTP MFA
- [x] Separate platform RBAC with administrator/operator/auditor authority distinction
- [x] Platform sessions use expiry, idle timeout, rotation and revocation
- [x] Platform login rate limiting
- [x] Privileged audit logging
- [x] Database-level audit immutability
- [x] Tenant operational directory/detail
- [x] Tenant suspension enforcement against clinic sessions
- [x] Datastore/residency fail-closed guard
- [x] Clinical/patient-registry data excluded from Platform Control views

### Control-panel information architecture
- [x] Overview: clinics, trials, subscriptions, datastore health
- [x] Clinics / Tenants directory and operational detail
- [~] Provisioning controls/status
- [~] Data residency controls and evidence
- [x] Datastore inventory, lifecycle and health
- [x] Security & Audit operations
- [x] Payment integration health/reconciliation surface defined
- [~] Maintenance and suspension controls
- [x] Platform health and actionable operational status

### Platform security
- [~] Cross-tenant denial tests for platform roles
- [x] Platform-role authorization matrix implemented and unit-tested
- [x] High-risk actions classified and explicit confirmation gate implemented
- [x] Destructive/irreversible tenant-suspension protections wired to operational mutations
- [x] Tenant suspension is enforced against clinic sessions server-side
- [x] Tenant impersonation disabled by default
- [x] Break-glass access is not implemented; if introduced, it must be explicit, time-bounded and fully audited
- [x] Platform Control cannot expose unrestricted patient-registry/clinical data merely because a user is a platform admin

### Platform auditability
- [x] Implemented platform authentication/suspension actions emit audit events
- [x] Audit records capture actor, role, scope, action, timestamp, outcome and target/reference
- [x] Platform audit records are access-controlled
- [x] Platform admins cannot edit/delete audit evidence at the database layer
- [~] Security alerts have ownership, severity, status and resolution evidence

### Platform release tests
- [~] Platform-admin login/MFA E2E
- [~] Platform authorization matrix E2E
- [~] Cross-tenant denial E2E
- [ ] Provisioning/lifecycle E2E
- [~] Residency/datastore control E2E
- [~] Maintenance/suspension authorization E2E
- [~] Audit completeness E2E
- [~] High-risk confirmation/step-up E2E
- [~] Sensitive-data minimization/no-secret-leak tests
- [~] Accessibility/responsive verification

## P0 — Production infrastructure

- [ ] Production Prisma migrations applied successfully against real production DB
- [ ] Production DB connection verified
- [ ] Required production environment variables verified
- [ ] No development/test credentials in production
- [ ] Production domain/aliases verified
- [ ] Production database geography verified
- [ ] Backup/DR geography verified
- [ ] Provider/subprocessor geography verified
- [ ] Backups enabled and restore tested
- [ ] Rollback/runbook tested, not merely documented
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

- [x] Heri CMS branding work
- [x] Heri CMS OpenGraph/social metadata
- [x] Premium landing/dashboard showcase integration
- [~] Final production canonical-domain/metadata verification
- [~] Social preview verification
- [~] Public links/CTAs verification
- [~] Responsive landing-page QA
- [~] Accessibility/contrast audit
- [~] Image optimization / modern formats

## P1 — Application QA

- [x] Existing custom 404 implementation
- [ ] Full internal/external link audit
- [~] Form validation and clear error states
- [ ] Spam protection on public forms
- [~] Responsive QA across mobile/tablet/desktop
- [~] Core Web Vitals/performance verification
- [~] Accessibility keyboard/focus/screen-reader verification

## Existing coverage carried into this branch

- [x] Pharmacy/partial-dispensing/return-disposal/error-path coverage
- [x] Offline synchronization protections
- [x] Secret scanning in CI
- [x] Production build and existing E2E suite

## Release gate

Before merge approval:

- [ ] All applicable P0 items complete
- [ ] Platform Control full privileged E2E/authz/security/audit evidence complete
- [ ] Provisioning/lifecycle and residency/datastore evidence complete
- [ ] Production database/migration/backup evidence complete
- [ ] Privacy/legal approval complete
- [ ] Heri-only branding/public-site QA complete
- [ ] Accessibility/responsive/performance verification complete
- [ ] Fresh CI green on final branch head
- [ ] Vercel Preview verified on final branch head
- [ ] No secrets in tracked files/client bundle
- [ ] Production smoke test complete
- [ ] Explicit user approval received before merging `main`

> **Branch discipline:** This checklist update is scoped to `feat/production-e2e-readiness`. `main` must not be touched or merged as part of this work unless explicitly requested.
