# Hali CMS — Production Readiness Checklist

**Product:** Hali CMS — Clinic Management System  
**Purpose:** Single source of truth for the work required before declaring the platform production-ready.

## Status legend

- [x] **Done** — implemented and verified with evidence
- [~] **In progress** — implementation exists but still needs completion or verification
- [ ] **Not started** — agreed work has not been implemented

> **Release rule:** A successful Vercel build/deployment alone does not equal production readiness. Production readiness requires functional application flow, production database/configuration verification, security checks, residency controls, and validation evidence.

## Current implementation pass

This pass completed the code-level items that can be safely implemented from repository evidence without inventing production infrastructure or compliance facts. Production-only verification remains explicitly open.

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
- [~] Functional test: rate limiting behaves as intended — automated service coverage added; runtime verification still required
- [x] Add automated tests for trial service and API behavior
- [ ] Improve browser-facing trial error UX
- [x] Remove/simplify sensitive email data in success-page URLs

## 3. Trial security hardening

- [x] IP-based trial rate limiting exists with an explicit five-attempt/hour boundary
- [x] Explicit Origin validation on the trial endpoint
- [x] `Cache-Control: no-store` on sensitive trial responses
- [x] Generic external error responses
- [x] Internal exception details/codes are not returned by the trial endpoint
- [x] Passwords are not placed in trial success URLs or responses
- [~] Sensitive signup data logging — the trial endpoint logs only an internal error code; verify deployment/runtime logs contain no request payloads
- [x] CSRF/cross-origin behavior has explicit same-origin Origin validation for trial POSTs
- [x] Replace brittle clinic-code unique-error string matching with precise Prisma `P2002` handling

## 4. Authentication, authorization and account security

- [x] Existing password hashing utility
- [x] Existing login security/rate limiting
- [x] MFA infrastructure
- [x] Role-based authorization infrastructure
- [x] Central clinic entitlement enforcement
- [x] Audit-event infrastructure
- [ ] End-to-end test MFA login flow in production-like environment
- [x] Suspended/disabled users are rejected by server-side session/login checks
- [ ] Verify authorization boundaries for every clinic module
- [x] Session expiry/revocation behavior is enforced server-side
- [ ] Verify brute-force/rate-limit behavior under realistic conditions
- [ ] Verify security-sensitive actions generate appropriate audit evidence

## 5. Tenant isolation and clinic data boundaries

- [x] Clinic membership model
- [x] Tenant-aware datastore model
- [x] Tenant datastore health guard
- [x] Pool / bridge / silo isolation modes represented in platform models
- [ ] Review every clinic-facing data access path for tenant scoping
- [x] Server authorization has an explicit fail-closed tenant assertion
- [ ] Test cross-tenant access attempts end-to-end
- [x] Clinic selection is membership-bound during login
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
- [~] Self-service Kenya-only pooled trial provisioning currently records the datastore as `HEALTHY`; code-level safety documentation added, but real infrastructure validation is still required
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
- [ ] Define platform-only notification events separately from clinic notification events
- [ ] Define platform operator notification audience and permissions

> The Platform Control surface is **not currently an existing UI**. It must not be represented as already available.

## 9. Clinic application / dashboard UX

- [x] Replace the existing **`Zipporah W.`** placeholder with **`User`** where the placeholder is sourced as a missing user name
- [x] Update dashboard top-left branding to Hali CMS / Clinic Management System
- [x] Preserve agreed Hali CMS branding hierarchy across login/application/dashboard
- [ ] Verify navigation labels and permissions remain clear
- [ ] Review empty/loading/error states across core modules
- [ ] Review accessibility of forms, navigation and actions
- [x] Responsive behavior is represented in the shared dashboard shell CSS; final deployment verification remains open

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

## 11. Pharmacy, accounts and user-account readiness audit

The modules exist in code, but existence is not treated as production readiness. This audit must establish that the workflows are complete, secure, tested and operational before notifications are wired to them.

### Pharmacy

- [x] Pharmacy workspace exists and reads live clinic-scoped prescriptions, stock and expiry data
- [x] Dispensing workflow exists with FEFO stock allocation
- [x] Dispensing creates the associated pharmacy charge/invoice item
- [x] Dispensing records an audit event
- [ ] Verify inventory management UI and stock-adjustment actions end-to-end
- [ ] Verify stock movement/history and discrepancy handling
- [ ] Verify expiry/expired-stock workflow and edge cases
- [ ] Verify prescription → dispensing lifecycle end-to-end
- [ ] Verify pharmacy permissions and negative authorization cases
- [ ] Verify pharmacy automated/browser test coverage

### Accounts / finance

- [x] Accounts workspace exists and reads live clinic-scoped invoice/payment data
- [x] Invoice creation workflow exists
- [x] Payment recording exists with duplicate external-reference protection
- [x] Invoice status updates on payment
- [x] Payment/invoice audit events exist
- [ ] Verify reconciliation workflow and financial edge cases
- [ ] Verify partial payment, overpayment, duplicate payment and void scenarios
- [ ] Verify accounts permissions and negative authorization cases
- [ ] Verify accounts automated/browser test coverage
- [ ] Verify financial reporting consistency with source records

### User accounts / roles

- [x] Clinic-scoped session and membership model exists
- [x] Roles include ADMIN, PHARMACY and ACCOUNTS
- [x] Permission model distinguishes pharmacy/accounts/user-management capabilities
- [x] Session rejects inactive users and missing clinic membership
- [ ] Verify staff/user lifecycle management UI
- [ ] Verify user creation, activation/deactivation and role assignment workflows
- [ ] Verify user-management permissions and negative authorization cases
- [ ] Verify account lifecycle audit evidence
- [ ] Verify user-management automated/browser test coverage

## 12. Clinic notifications and alerts

Notifications are an **attention/action layer**, not a duplicate of live dashboard statistics. The notification center is clinic-scoped and role-aware.

### Boundary with the dashboard

- [ ] Keep live dashboard metrics as live metrics; do not turn every metric into a notification
- [ ] Allow the dashboard to show a compact attention summary linking to the notification center/workflow
- [ ] Notifications must represent an actionable event, threshold or exception
- [ ] Direct notification links must open the relevant clinic workflow/record

### Role-aware event catalog

- [ ] Clinic admin notifications: staff-account actions, important workflow exceptions, important pharmacy/accounts exceptions, security/account events
- [ ] Pharmacy notifications: low stock, approaching expiry, expired stock, dispensing/prescription exceptions, stock discrepancies
- [ ] Accounts notifications: overdue/materially outstanding invoices, payment/reconciliation exceptions, failed/incomplete transactions, billing items requiring review
- [ ] Do not broadcast pharmacy/accounts events to users without the relevant role/permission

### Notification behavior

- [ ] In-app notification center
- [ ] Unread/read state
- [ ] Notification history
- [ ] Severity levels: informational, attention required, critical
- [ ] Role/permission-aware routing
- [ ] Direct links to relevant workflows/records
- [ ] Important notification auditability/acknowledgement where required
- [ ] Deliberate event catalog and noise controls
- [ ] Initial delivery remains in-app; email/SMS/push are separate future channels

### Platform-control separation

- [ ] Platform Control notifications are restricted to explicitly authorized Heri platform operators
- [ ] Platform events include tenant provisioning/health, subscription lifecycle, residency/security failures, failed migrations and other platform-operational exceptions
- [ ] Platform Control is not the mechanism for ordinary clinic pharmacy/accounts notifications
- [ ] Shared notification/event infrastructure, if used, must preserve separate audiences and authorization boundaries

## 13. Production database and deployment configuration

- [x] Successful Vercel deployment exists for the corrected trial implementation
- [ ] Confirm production Prisma migration is applied to the production database
- [ ] Confirm production database connection is valid
- [ ] Confirm required production environment variables are configured
- [ ] Confirm no development/test credentials are used in production
- [ ] Confirm production secrets are stored through the deployment secret mechanism
- [ ] Confirm database backups are enabled and tested
- [x] Document restore procedure in `docs/OPERATIONS-RUNBOOK.md`
- [x] Document deployment rollback procedure in `docs/OPERATIONS-RUNBOOK.md`
- [ ] Confirm production domain/aliases
- [ ] Confirm cache behavior for authenticated/sensitive pages

## 14. Observability and operations

- [x] Existing audit infrastructure
- [ ] Production application error monitoring verification
- [ ] Platform health monitoring
- [ ] Datastore health monitoring
- [ ] Authentication/security event monitoring
- [ ] Alerting for repeated authentication failures
- [ ] Alerting for datastore degradation
- [ ] Alerting for failed migrations/provisioning
- [x] Operational runbook
- [x] Incident-response procedure
- [x] Backup/restore runbook
- [x] Maintenance procedure
- [x] Rollback procedure

## 15. Testing and release validation

- [x] Existing auth/MFA/authorization/audit/residency automated tests have passed historically
- [x] Existing Playwright smoke test has passed historically
- [ ] Re-run typecheck against current HEAD
- [ ] Re-run lint against current HEAD
- [ ] Re-run full automated test suite against current HEAD
- [ ] Re-run production build against current HEAD
- [ ] Re-run Playwright against current HEAD
- [x] Add trial-specific automated coverage
- [ ] Add tenant-isolation tests where gaps exist
- [ ] Add production-like signup/login/expiry E2E test
- [ ] Verify no secrets/passwords are exposed in test output

## 16. Legal / compliance operational readiness

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

## 17. Production release gate

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
- [ ] Clinic notification event catalog and role routing are verified
- [ ] Notification authorization/tenant isolation is verified
- [ ] Platform-control notification boundaries are verified
- [ ] Legal/compliance operational requirements are reviewed
- [x] Rollback and incident procedures are documented

## Current known release evidence

- **Latest successful Vercel deployment:** commit `de0affa1fd1d52d2c02c5f5ccfba10895e31dd61`
- **Deployment state:** READY
- **Application:** Hali CMS
- **Branch:** `feat/mfa-login-protection`

This evidence confirms a successful deployment of the corrected trial implementation. It does **not** by itself close the functional, database, residency, operational or compliance gates above.
