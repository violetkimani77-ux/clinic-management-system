# Heri CMS — Production Readiness Checklist

**Product:** Heri CMS / HeriCMS — Clinic Management System  
**Branch:** `feat/production-e2e-readiness`  
**Rule:** `main` remains unchanged until explicit approval.  
**Naming:** **Heri CMS / HeriCMS only.** Hali CMS is historical and must not appear in new product-facing work.

## Status legend
- [x] Done and supported by implementation/test evidence
- [~] In progress / partially implemented and requires completion or verification
- [ ] Not started or blocked on production evidence

## P0 — Core production safety

### Authentication, authorization and tenant isolation
- [x] Password hashing and login rate limiting
- [x] RBAC and entitlement enforcement
- [x] Suspended/disabled users rejected server-side
- [x] Session expiry/revocation
- [x] Clinic membership binding during login
- [x] Tenant-aware datastore guard / fail-closed tenant assertion
- [x] Cross-tenant authorization E2E coverage
- [x] Protected patient-data access E2E coverage
- [x] Session lifecycle E2E coverage
- [ ] Full authorization matrix across every module/action
- [ ] MFA E2E verification and production enforcement evidence
- [ ] Secure cookie attributes, rotation and session-fixation/hijacking verification

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
- [ ] Production-scale offline pull/change-cursor strategy
- [ ] Operational sync monitoring and conflict workflow

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
- [x] Platform Control readiness requirements defined
- [x] Dedicated Platform Control architecture document created
- [x] Initial read-only Platform Control route scaffolded
- [x] Clinic `ADMIN` sessions are **not** treated as platform-admin authority
- [x] Platform route is inaccessible to ordinary clinic sessions until dedicated platform authentication exists
- [x] Platform operational overview UI design started
- [x] Dedicated platform-admin identity/session model
- [x] Mandatory platform-admin MFA
- [x] Separate least-privilege platform RBAC matrix implemented
- [x] Platform-admin session rotation, expiry and revocation

### Control-panel information architecture
- [x] Overview: clinics, trials, subscriptions, datastore health
- [ ] Clinics / Tenants directory and operational detail
- [ ] Provisioning controls/status
- [ ] Data residency controls and evidence
- [~] Datastore inventory, lifecycle and health
- [~] Security & Audit operations
- [ ] Payment integration health/reconciliation
- [ ] Maintenance and suspension controls
- [ ] Platform health and actionable alerts

### Platform security
- [ ] Cross-tenant denial tests for platform roles
- [x] Platform-role authorization matrix implemented and unit-tested
- [x] High-risk actions classified and explicit confirmation gate implemented
- [ ] Destructive/irreversible action protections wired to operational mutations
- [x] Tenant impersonation disabled by default
- [ ] Break-glass access, if introduced, must be explicit, time-bounded and fully audited
- [ ] Platform Control cannot expose unrestricted patient-registry/clinical data merely because a user is a platform admin

### Platform auditability
- [~] Every provisioning/suspension/migration/residency/maintenance/security action emits an audit event
- [x] Audit records capture actor, role, scope, action, timestamp, outcome and target/reference for platform authentication events
- [x] Platform audit records are access-controlled through the dedicated platform boundary
- [ ] Platform admins cannot edit/delete audit evidence
- [ ] Security alerts have ownership, severity, status and resolution evidence

### Platform release tests
- [~] Platform-admin login/MFA E2E
- [ ] Platform authorization matrix E2E
- [ ] Cross-tenant denial E2E
- [ ] Provisioning/lifecycle E2E
- [ ] Residency/datastore control E2E
- [ ] Maintenance/suspension authorization E2E
- [ ] Audit completeness E2E
- [ ] High-risk confirmation/step-up E2E
- [ ] Sensitive-data minimization/no-secret-leak tests
- [ ] Accessibility/responsive verification

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
- [ ] Application/datastore/background-job health monitoring active
- [ ] Authentication/security alerts active
- [ ] Backup/migration/provisioning failure alerts active
- [ ] Incident-response drill completed

## P1 — Privacy, legal and compliance

Existing Privacy Policy and Terms & Conditions implementations exist on dedicated branches and should be consolidated into the Heri-only production branch rather than recreated.

- [~] Consolidate existing Privacy Policy into production branch
- [~] Consolidate existing Terms & Conditions into production branch
- [ ] Final legal/operator details reviewed and approved
- [ ] Actual production DB/backup/provider residency evidence verified
- [ ] Transfer-assessment workflow verified
- [ ] Retention/deletion/breach/legal-request procedures verified
- [ ] DPA/provider contractual safeguards verified
- [ ] Cookie/analytics behavior documented and privacy-approved

## P1 — SEO, public experience and branding

- [ ] All product-facing copy uses Heri CMS / HeriCMS only
- [ ] Metadata uses Heri CMS branding
- [ ] Final production `metadataBase` / canonical domain verified
- [ ] Open Graph/Twitter metadata verified
- [ ] Sitemap verified
- [ ] Robots verified
- [ ] Social preview verified
- [ ] Favicon/app icons consolidated from existing work
- [ ] Public links/CTAs verified
- [ ] Responsive landing-page QA
- [ ] Accessibility/contrast audit
- [ ] Informative image alt-text audit
- [ ] Image optimization / modern formats

## P1 — Application QA

- [x] Custom 404 implementation exists on production-readiness branch
- [ ] Consolidate the best existing custom 404 design from prior branch if it is superior
- [ ] Full internal/external link audit
- [ ] Form validation and clear error states
- [ ] Spam protection on public forms
- [ ] Responsive QA across mobile/tablet/desktop
- [ ] Core Web Vitals/performance verification
- [ ] Accessibility keyboard/focus/screen-reader verification

## Release gate

Before merge approval:

- [ ] All P0 items complete
- [ ] Platform Control privileged boundary implemented and verified
- [ ] Production database/migration/backup evidence complete
- [ ] Privacy/Terms consolidated and legally approved
- [ ] Heri-only branding audit complete
- [ ] SEO/social assets verified
- [ ] Accessibility/responsive/performance/link/form audits complete
- [ ] CI green on final branch head
- [ ] Vercel Preview verified on final branch head
- [ ] No secrets in tracked files/client bundle
- [ ] Production smoke test complete
- [ ] Explicit user approval received before merging `main`
