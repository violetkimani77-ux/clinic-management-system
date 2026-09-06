# Hali CMS — Production Readiness Checklist

**Product:** Hali CMS — Clinic Management System  
**Purpose:** Single source of truth for the work required before declaring the platform production-ready.

## Status legend

- [x] **Done** — implemented and verified with evidence
- [~] **In progress** — implementation exists but still needs completion or verification
- [ ] **Not started** — agreed work has not been implemented

> **Release rule:** A successful Vercel build/deployment alone does not equal production readiness. Production readiness requires functional application flow, production database/configuration verification, security checks, residency controls, and validation evidence.

## 1. Public product experience

- [x] Public marketing landing page at `/`
- [x] Hali CMS / Clinic Management System positioning
- [x] Conversion-focused landing-page copy
- [x] Locked section title: **Built for the whole clinic**
- [x] Locked section title: **Security by design**
- [x] Montserrat typography foundation
- [x] Hali CMS brand lockup with Clinic Management System beneath it
- [x] Free-trial CTA connected to `/trial`
- [ ] Review all public copy for final commercial/legal approval
- [ ] Verify responsive/mobile presentation in the final deployment
- [ ] Verify public navigation and all CTA links end-to-end

## 2. Self-service trial lifecycle

- [x] Trial signup page
- [x] Trial API endpoint
- [x] Input validation
- [x] Password hashing using the existing password utility
- [x] Clinic creation
- [x] Administrator user creation
- [x] ADMIN membership creation
- [x] Four-day trial subscription creation
- [x] Tenant datastore record creation
- [x] Trial success page
- [x] Central entitlement enforcement already blocks expired clinic access
- [ ] Functional test: landing → trial → successful signup
- [ ] Functional test: created administrator can log in
- [ ] Functional test: created administrator reaches dashboard/workspace
- [ ] Functional test: trial expiry blocks protected workspace access
- [ ] Functional test: duplicate administrator email is handled safely
- [ ] Functional test: rate limiting behaves as intended
- [ ] Add automated tests for trial service and API behavior
- [ ] Improve browser-facing trial error UX
- [ ] Remove/simplify sensitive email data in success-page URLs if appropriate

## 3. Trial security hardening

- [~] IP-based trial rate limiting exists; verify intended threshold/off-by-one behavior
- [ ] Explicit Origin validation on the trial endpoint
- [ ] `Cache-Control: no-store` on sensitive trial responses
- [ ] Generic external error responses
- [ ] Confirm internal exception details/codes are never exposed to users
- [ ] Confirm passwords never appear in URLs, responses, or logs
- [ ] Confirm sensitive signup data is not logged
- [ ] Confirm CSRF/cross-origin behavior is appropriate for the final deployment
- [ ] Replace brittle clinic-code unique-error string matching with precise Prisma `P2002` handling if retained

## 4. Authentication, authorization and account security

- [x] Existing password hashing utility
- [x] Existing login security/rate limiting
- [x] MFA infrastructure
- [x] Role-based authorization infrastructure
- [x] Central clinic entitlement enforcement
- [x] Audit-event infrastructure
- [ ] End-to-end test MFA login flow in production-like environment
- [ ] Verify suspended/disabled users cannot authenticate or access protected areas
- [ ] Verify authorization boundaries for every clinic module
- [ ] Verify session expiry/revocation behavior
- [ ] Verify brute-force/rate-limit behavior under realistic conditions
- [ ] Verify security-sensitive actions generate appropriate audit evidence

## 5. Tenant isolation and clinic data boundaries

- [x] Clinic membership model
- [x] Tenant-aware datastore model
- [x] Tenant datastore health guard
- [x] Pool / bridge / silo isolation modes represented in platform models
- [ ] Review every clinic-facing data access path for tenant scoping
- [ ] Test cross-tenant access attempts fail closed
- [ ] Test clinic switching/session boundaries if applicable
- [ ] Verify background jobs and reports preserve tenant boundaries
- [ ] Verify exports/downloads preserve tenant boundaries
- [ ] Verify support/admin access is explicitly authorized and audited

## 6. Kenya-first data residency and privacy

- [x] Kenya data-residency policy document
- [x] Residency validation library
- [x] Kenya-only pooled-storage validation
- [x] Cross-border transfer controls represented in the policy/model
- [x] Residency-related platform fields
- [ ] Verify actual production database/backup geography
- [ ] Verify provider/subprocessor geography and processing locations
- [ ] Verify backup/DR geography satisfies the selected clinic policy
- [ ] Implement operational residency validation before datastore activation
- [ ] Implement transfer-assessment workflow for cross-border processing
- [ ] Track required consent/legal basis for applicable cross-border sensitive-data processing
- [ ] Retain residency/transfer evidence per clinic
- [ ] Verify analytics, monitoring and support tooling do not unintentionally export identifiable health data
- [ ] Verify provider contractual safeguards/DPA requirements
- [ ] Verify breach, deletion, retention and legal-request procedures

## 7. Tenant datastore provisioning

- [x] `TenantDataStore` model
- [x] Isolation mode model: POOL / BRIDGE_DATABASE / SILO_DATABASE
- [x] Residency policy model
- [x] Transfer assessment status/ref fields
- [x] Datastore health status model
- [x] Runtime health guard
- [~] Self-service Kenya-only pooled trial provisioning currently records the datastore as `HEALTHY`; explicitly validate this assumption against real infrastructure
- [ ] Implement/verify lifecycle: `SETUP → RESIDENCY_SELECTED → RESIDENCY_VALIDATED → PROVISIONING → MIGRATING → HEALTHY`
- [ ] Fail closed when residency validation fails
- [ ] Fail closed when datastore health checks fail
- [ ] Fail closed when backup/migration/security validation fails
- [ ] Implement dedicated datastore provisioning for BRIDGE_DATABASE
- [ ] Implement dedicated datastore provisioning for SILO_DATABASE
- [ ] Implement secure connection-secret reference handling
- [ ] Implement datastore migration/version tracking
- [ ] Implement recurring datastore health checks

## 8. Hali CMS Platform Control

- [ ] Create separate Hali CMS Platform Control surface
- [ ] Overview
- [ ] Clinics / Tenants
- [ ] Provisioning
- [ ] Data Residency
- [ ] Datastores
- [ ] Security / Audit
- [ ] Maintenance
- [ ] Platform Health
- [ ] Platform-admin authentication and authorization
- [ ] Platform-admin audit trail
- [ ] Safe tenant provisioning/deprovisioning controls
- [ ] Safe maintenance controls with confirmation and audit evidence

> The Platform Control surface is **not currently an existing UI**. It must not be represented as already available.

## 9. Clinic application / dashboard UX

- [ ] Replace the existing **`Zipporah W.`** placeholder with **`User`** where that placeholder is actually sourced
- [ ] Update dashboard top-left branding to Hali CMS / Clinic Management System
- [ ] Preserve agreed Hali CMS branding hierarchy across login/application/dashboard
- [ ] Verify navigation labels and permissions remain clear
- [ ] Review empty/loading/error states across core modules
- [ ] Review accessibility of forms, navigation and actions
- [ ] Verify responsive behavior across dashboard modules

## 10. Core clinic workflows

- [x] Patients module exists
- [x] Visits module exists
- [x] Pharmacy module exists
- [x] Accounts module exists
- [x] Reports module exists
- [x] Help module exists
- [ ] End-to-end patient workflow verification
- [ ] End-to-end visit workflow verification
- [ ] End-to-end pharmacy/medicine workflow verification
- [ ] End-to-end accounts/payment workflow verification
- [ ] End-to-end reporting workflow verification
- [ ] Verify all workflows enforce clinic permissions
- [ ] Verify sensitive operations are audited where required

## 11. Production database and deployment configuration

- [x] Successful Vercel deployment exists for the corrected trial implementation
- [ ] Confirm production Prisma migration is applied to the production database
- [ ] Confirm production database connection is valid
- [ ] Confirm required production environment variables are configured
- [ ] Confirm no development/test credentials are used in production
- [ ] Confirm production secrets are stored through the deployment secret mechanism
- [ ] Confirm database backups are enabled and tested
- [ ] Confirm restore procedure works
- [ ] Confirm deployment rollback procedure
- [ ] Confirm production domain/aliases
- [ ] Confirm cache behavior for authenticated/sensitive pages

## 12. Observability and operations

- [x] Existing audit infrastructure
- [ ] Production application error monitoring verification
- [ ] Platform health monitoring
- [ ] Datastore health monitoring
- [ ] Authentication/security event monitoring
- [ ] Alerting for repeated authentication failures
- [ ] Alerting for datastore degradation
- [ ] Alerting for failed migrations/provisioning
- [ ] Operational runbook
- [ ] Incident-response procedure
- [ ] Backup/restore runbook
- [ ] Maintenance procedure
- [ ] Rollback procedure

## 13. Testing and release validation

- [x] Existing auth/MFA/authorization/audit/residency automated tests have passed historically
- [x] Existing Playwright smoke test has passed historically
- [ ] Re-run typecheck against current HEAD
- [ ] Re-run lint against current HEAD
- [ ] Re-run full automated test suite against current HEAD
- [ ] Re-run production build against current HEAD
- [ ] Re-run Playwright against current HEAD
- [ ] Add trial-specific automated coverage
- [ ] Add tenant-isolation tests where gaps exist
- [ ] Add production-like signup/login/expiry E2E test
- [ ] Verify no secrets/passwords are exposed in test output

## 14. Legal / compliance operational readiness

- [x] Kenya-first residency policy documented
- [x] Kenya DPA / transfer considerations researched
- [ ] Final legal/compliance review of the implemented processing model
- [ ] Controller/processor responsibilities documented
- [ ] Cloud-provider/subprocessor register
- [ ] Data-retention/deletion policy
- [ ] Data-subject request process
- [ ] Security incident/breach process
- [ ] Cross-border transfer assessment process
- [ ] Evidence-retention process
- [ ] Customer-facing privacy/data-residency disclosures

## 15. Production release gate

The release should **not** be declared production-ready until all applicable items below are verified:

- [ ] Trial signup works against the intended production-like database
- [ ] Trial admin can log in
- [ ] Trial admin can reach the clinic workspace
- [ ] Expired trial access is blocked
- [ ] Duplicate/rate-limit/security cases behave safely
- [ ] Tenant isolation is verified
- [ ] Residency and backup geography are verified
- [ ] Production migration is applied
- [ ] Production environment variables/secrets are verified
- [ ] Backups and restore process are verified
- [ ] Automated tests pass on current HEAD
- [ ] Build passes on current HEAD
- [ ] E2E smoke test passes on current HEAD
- [ ] Observability/alerting is operational
- [ ] Legal/compliance operational requirements are reviewed
- [ ] Rollback and incident procedures are documented

## Current known release evidence

- **Latest successful Vercel deployment:** commit `de0affa1fd1d52d2c02c5f5ccfba10895e31dd61`
- **Deployment state:** READY
- **Application:** Hali CMS
- **Branch:** `feat/mfa-login-protection`

This evidence confirms a successful deployment of the corrected trial implementation. It does **not** by itself close the functional, database, residency, operational or compliance gates above.
