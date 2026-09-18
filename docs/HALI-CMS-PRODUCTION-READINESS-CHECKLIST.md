# Heri CMS — Production Readiness Checklist

**Product:** Heri CMS / HeriCMS — Clinic Management System  
**Purpose:** Single source of truth for the work required before declaring the platform production-ready.  
**Naming:** The current product name is **Heri CMS / HeriCMS**. **Hali CMS** is the former name and must not be used for new product-facing copy, UI, metadata, or documentation except where historical context is necessary.

## Status legend
- [x] **Done** — implemented and verified with evidence
- [~] **In progress** — implementation exists but still needs completion or verification
- [ ] **Not started** — agreed work has not been implemented

> **Release rule:** A successful Vercel build/deployment alone does not equal production readiness. Production readiness requires functional application flow, production database/configuration verification, security checks, secure sessions, tenant isolation, Kenya-first residency/privacy controls, data-export controls, payment-data integrity, backups/restore, observability, and validation evidence.

## 0. Architecture foundations — locked before scale

### 0.1 HeriCMS data ownership boundary
- [x] HeriCMS is a patient-registry and clinic-operations platform, not the authoritative longitudinal clinical-record system
- [x] Platform architecture must not assume HeriCMS stores a complete clinical record
- [ ] Define the exact patient-registry/operational data boundary and prohibited clinical-data classes
- [ ] Verify every module against that boundary before production launch
- [ ] Ensure Platform Control does not become an unrestricted clinical-record viewer

### 0.2 Canonical health-data interoperability
- [ ] Define a canonical Heri domain model that is not tightly coupled to one external health-data standard
- [ ] Patient registry mappings to FHIR Patient/Organization/Practitioner concepts
- [ ] Visit/encounter mappings to FHIR Encounter concepts where applicable
- [ ] Define OpenMRS interoperability mappings where useful
- [ ] Define KHIS/DHIS2 reporting mappings and terminology/code mappings
- [ ] Preserve stable Heri identifiers plus external-system identifiers/mapping records
- [ ] Define terminology/versioning strategy so interoperability mappings can evolve without destructive schema changes
- [ ] Test representative Heri records through FHIR/OpenMRS/KHIS mappings

### 0.3 Tiered multi-tenancy and data sovereignty
- [x] Shared-schema tenancy is the economical default for the initial clinic scale
- [x] Tenant isolation is abstracted through tenant-aware datastore concepts rather than assuming one physical storage layout
- [ ] Shared-schema implementation uses strict tenant scoping and database-level row isolation where appropriate
- [ ] Define schema-per-tenant as the intermediate stronger-isolation tier
- [ ] Define database-per-tenant as the dedicated sovereignty/enterprise tier
- [ ] Define objective criteria for moving a tenant between pool/schema/database isolation modes
- [ ] Ensure migrations, backups, restore, monitoring and support tooling work across all isolation modes
- [ ] Ensure tenant/application code is storage-mode agnostic
- [ ] Document data-sovereignty guarantees and limitations for each isolation tier
- [ ] Test cross-tenant isolation independently for each supported isolation mode

### 0.4 Offline-first and synchronization architecture
- [ ] Treat offline-first as a core architecture decision, not a UI enhancement
- [ ] Define device-local persistence for Heri-owned patient-registry/operational data
- [ ] Define tenant- and user-scoped local storage boundaries
- [ ] Define operation IDs and an offline outbox for every offline mutation
- [ ] Define idempotent server-side sync processing
- [ ] Define incremental pull/change cursors
- [ ] Define optimistic versioning and conflict detection
- [ ] Define domain-specific conflict-resolution policies
- [ ] Define explicit conflict queues for records that cannot be safely merged
- [ ] Define offline authentication/session/revocation rules
- [ ] Define online-only operations, including irreversible/high-risk financial and administrative operations
- [ ] Define sync retry, reconnect, duplicate, replay and out-of-order handling
- [ ] Implement Patients/registry offline sync before expanding offline scope to additional modules

### 0.5 Payments and billing architecture
- [ ] Daraja integration boundary documented for verified payment events
- [ ] Patient-payment flow separated from HeriCMS subscription billing
- [ ] Clinic subscription billing supports STK Push with authoritative payment confirmation
- [ ] Insurance co-pay collection represented as a separate payment/business flow if enabled
- [ ] Payment identities/references are stable, unique and provenance-preserving
- [ ] Payment integrations remain server-authorized and tenant-bound
- [ ] Offline architecture never fabricates or finalizes authoritative payment settlement

## 1. Public product experience
- [x] Public marketing landing page at `/`
- [x] Heri CMS / Clinic Management System positioning
- [x] Conversion-focused landing-page copy
- [x] Locked section title: **Built for the whole clinic**
- [x] Locked section title: **Security by design**
- [x] Montserrat typography foundation
- [x] Heri CMS brand lockup with Clinic Management System beneath it
- [x] Free-trial CTA connected to `/trial`
- [ ] Review all public copy for final commercial/legal approval
- [ ] Verify responsive/mobile presentation in final deployment
- [ ] Verify public navigation and all CTA links end-to-end

## 2. Self-service trial lifecycle
- [x] Trial signup page/API, validation, password hashing, clinic/admin/membership creation, four-day trial, tenant datastore and success flow
- [x] Central entitlement enforcement
- [x] Sensitive signup URL data removed
- [x] Trial endpoint hardened with same-origin validation, no-store responses and generic client errors
- [x] Precise Prisma `P2002` handling
- [x] Trial service automated coverage
- [ ] Landing → trial → signup E2E
- [ ] Created administrator login/dashboard E2E
- [ ] Trial expiry/entitlement E2E
- [ ] Duplicate administrator email E2E
- [ ] Runtime verification of rate limiting
- [ ] Browser-facing trial error UX

## 3. Trial security hardening
- [x] IP-based trial rate limiting implementation
- [x] Explicit Origin validation
- [x] No-store sensitive responses
- [x] Generic external errors
- [x] No internal exception details in client responses
- [x] Passwords absent from URLs/responses
- [x] Same-origin/CSRF protection
- [x] Precise Prisma conflict handling
- [ ] Verify runtime logs contain no signup request payloads/secrets/unauthorized PII

## 4. Authentication, authorization and secure session security
- [x] Password hashing
- [x] Login rate limiting — per-IP (20/15min) and per-email (5/15min) fixed-window limits on `/api/auth/login`, sharing the `AuthRateLimit` table and limiter used by trial signup (`src/lib/auth/rate-limit.ts`)
- [x] MFA infrastructure
- [x] RBAC and entitlement checks
- [x] Suspended/disabled users rejected server-side
- [x] Session expiry/revocation server-side
- [ ] E2E MFA verification
- [ ] Authorization matrix verified for every module/action
- [x] Realistic brute-force/rate-limit verification — `tests/auth/login.test.ts` covers per-IP and per-email lockout, confirms a rate-limited attempt never reaches the password/user lookup
- [ ] Security-sensitive authentication actions produce audit evidence
- [ ] **Secure session cookies:** HttpOnly; Secure in production; appropriate SameSite; narrow Path/Domain; appropriate Max-Age/Expires; no sensitive data in cookie values
- [ ] Session rotation after authentication and privilege changes
- [ ] Session fixation/hijacking tests
- [ ] Revocation verified after logout, membership removal and account disablement

## 5. Tenant isolation and clinic data boundaries
- [x] Clinic membership model
- [x] Tenant-aware datastore model
- [x] Tenant datastore health guard
- [x] Pool / bridge / silo isolation modes represented
- [x] Fail-closed tenant assertion
- [x] Clinic selection membership-bound during login
- [ ] Review every clinic-facing data-access path for tenant scoping
- [ ] Cross-tenant read/write E2E tests
- [ ] Background jobs/reports isolation tests
- [ ] Export/download isolation tests
- [ ] Support/admin authorization and audit verification

## 6. Kenya-first data residency and privacy
- [x] Kenya-first residency policy/validation library
- [x] Kenya-only pooled validation
- [x] Cross-border transfer controls/residency fields
- [ ] Actual production DB geography verified — **the single highest-priority open item as of 2026-09-17.** Digital Health Act 2023 Section 47 appears to restrict cross-border transfer of personal health data to health-tourism circumstances; practicing Kenyan counsel (Clyde & Co, March 2026) describe this as genuinely unresolved — it may bind every health data controller, or only the Digital Health Agency's own transfers — and explicitly recommend organizations on foreign-hosted infrastructure reassess exposure. The general DPA localization rule (Data Protection General Regulations 2021) is narrower and scoped to an enumerated list (civil registration, elections, public finance, protected computer systems) that does not obviously include private clinic health records, so that specific rule likely does not bind HeriCMS — but Section 47 might, and nobody has yet confirmed which country/provider actually hosts the production database to evaluate against it.
- [ ] Backup/DR geography verified
- [ ] Provider/subprocessor geography verified — see note above; same blocking fact.
- [ ] Operational residency validation with evidence
- [ ] Transfer assessment workflow
- [ ] Consent/legal-basis verification where applicable — DPA sections 48–50 require a lawful basis for any transfer outside Kenya, and sensitive personal data (health data, explicitly classified as such under the DPA) specifically requires the patient's *explicit* consent as an added condition. No such consent-capture flow currently exists in the product; deliberately not built yet pending the geography question above, to avoid building a flow that isn't needed.
- [ ] Residency/transfer evidence retention
- [ ] Analytics/monitoring/support tooling checked for identifiable health-data export
- [ ] Provider contractual safeguards/DPA requirements verified
- [ ] Breach/deletion/retention/legal-request procedures verified — **retention direction corrected 2026-09-17**: the Digital Health Act requires a 20-year *minimum retention* of health data, not deletion-on-request. A retention policy stating this floor is the actual near-term need; a deletion pipeline is not the right first build and could contradict the legal requirement if built as a default.

## 7. Tenant datastore provisioning and lifecycle
- [x] Datastore/residency/transfer/health models
- [x] Runtime health guard
- [~] Kenya-only pooled trial provisioning records HEALTHY; real infrastructure validation required
- [ ] Production lifecycle implementation
- [ ] Fail closed on residency/datastore/backup/migration/security validation failures
- [ ] Bridge/silo provisioning
- [ ] Secure connection-secret references
- [ ] Migration/version tracking
- [ ] Recurring datastore health checks
- [ ] Storage-mode migration path between pool, schema-per-tenant and database-per-tenant

## 8. Heri CMS Platform Control

### 8.1 Platform Control Panel purpose and boundary
- [ ] Separate platform control surface implemented
- [ ] Platform Control is a privileged platform-operations boundary, separate from the clinic application/dashboard
- [ ] Platform admins cannot be treated as ordinary clinic users with an implicit “super-admin” bypass
- [ ] Platform metadata/operations are separated from clinic patient-registry and operational data access
- [ ] Platform Control does not automatically grant unrestricted patient-registry access
- [ ] Any exceptional registry access requires explicit authorization, business justification, time-bounded access and audit evidence

### 8.2 Platform Control Panel information architecture
- [ ] **Overview:** platform health, active clinics, trials, subscriptions/entitlements, datastore health, payment-data integration health and security alerts
- [ ] **Clinics / Tenants:** directory, clinic profile, subscription/entitlement, users/memberships, datastore, residency and audit history
- [ ] **Provisioning:** new tenant, datastore provisioning, residency validation, migration status and provisioning failures
- [ ] **Data Residency:** Kenya residency status, database location, backup location, provider/subprocessor location and transfer assessments
- [ ] **Datastores:** pool/bridge/silo inventory, health, capacity, migration/version state and lifecycle operations
- [ ] **Security & Audit:** authentication events, administrative actions, tenant access, export/download events, security incidents and immutable audit records
- [ ] **Payment Integration:** integration health, event ingestion, reconciliation, failed events, reversals and data freshness
- [ ] **Maintenance:** maintenance windows, tenant suspension, migration operations and emergency controls
- [ ] **Platform Health:** application, database, datastore, background-job and payment-integration health with actionable alerts

### 8.3 Platform Control Panel UX and interaction design
- [ ] Consistent global navigation for the platform-operations surface
- [ ] Clear platform-admin identity, role and current session indicator
- [ ] Search, filtering, sorting and pagination for clinic/tenant and operational lists
- [ ] Clinic/tenant detail pages expose operational context without unnecessarily exposing patient-registry data
- [ ] Role-based navigation and action visibility
- [ ] Clear read-only vs actionable states
- [ ] Explicit confirmation for destructive, irreversible, suspension, migration and emergency actions
- [ ] High-risk actions require step-up authentication where appropriate
- [ ] Dangerous actions identify affected tenant(s), expected impact and rollback/recovery implications before confirmation
- [ ] Empty, loading, error, degraded-service and permission-denied states designed and tested
- [ ] Responsive behavior appropriate for operational use, while prioritizing safe desktop workflows for high-risk actions
- [ ] Accessibility: keyboard navigation, focus management, labels, contrast, status messaging and screen-reader semantics
- [ ] Sensitive values are minimized, masked or omitted unless operationally necessary
- [ ] Financial records shown in Platform Control use the same authoritative, immutable payment dataset as Accounts

### 8.4 Platform Control security architecture
- [x] Platform administration authentication with MFA enforced — `src/lib/platform/auth.ts` rejects any admin without `mfaEnabled`; not optional
- [x] Separate platform-admin authorization model from clinic RBAC — `src/lib/platform/authorization.ts`, distinct `PlatformAdminRole`/`PLATFORM_ACTIONS`, no relation to clinic `Membership`/RBAC
- [x] Least-privilege platform roles defined — `PLATFORM_ADMIN`/`PLATFORM_OPERATOR`/`PLATFORM_AUDITOR` with explicit per-role action lists (`ROLE_ACTIONS`), not implicit wildcards below admin
- [x] Step-up authentication for dangerous operations — `requireHighRiskStepUp` requires a fresh, correct password **and** a fresh, un-replayed MFA code via `reauthenticatePlatformAdmin`, not a confirmation string alone
- [x] Secure session expiry, rotation and revocation for platform-admin sessions — 15-min idle timeout, 2-hour TTL, automatic rotation every 10 minutes, `clearPlatformSession()` (`src/lib/platform/session.ts`)
- [x] Platform-admin sessions use secure cookie/session controls — SHA-256-hashed token at rest, cookie path scoped to `/platform`, isolated from the clinic staff session cookie
- [ ] Cross-tenant data leakage prevention tested
- [ ] Tenant impersonation is disabled by default; if ever enabled, it requires explicit authorization, strong visual indication, time limit and complete audit trail
- [x] Destructive/irreversible operations are protected against accidental or replayed execution — TOTP replay specifically: atomic DB-level compare-and-swap (`consumeTotpCounter`) confirmed via direct execution to reject a genuinely valid, already-used code; broader operation-level replay/idempotency beyond MFA codes not yet reviewed
- [ ] Emergency/break-glass controls are restricted, justified, time-bounded and audited

### 8.5 Platform Control auditability and operations
- [ ] Every provisioning, suspension, migration, residency, maintenance and security-sensitive administrative action produces an audit event — confirmed true for login/step-up/MFA paths (`recordPlatformAudit` called on every branch including pre-auth failures); not yet individually verified for every tenant-control/provisioning action
- [ ] Audit records include actor, role, tenant/scope, action, timestamp, outcome and relevant target/reference
- [ ] Audit records are tamper-evident and access-controlled
- [ ] Platform admins can review audit history without editing or deleting audit evidence
- [ ] Security alerts have ownership, severity, status and resolution/evidence workflow
- [ ] Operational failures expose actionable diagnostics without leaking secrets or patient-sensitive data
- [ ] Platform health checks and alerts have documented response procedures
- [x] Platform Control actions have authorization and negative-path tests, not only happy-path tests — `tests/platform/auth.test.ts` and `tests/unit/platform-authorization.test.ts` include explicit negative-path assertions (e.g. `mfa_replay` rejection reason on a losing compare-and-swap), not just happy-path coverage

### 8.6 Platform Control Panel release tests
- [ ] Platform-admin login/MFA E2E — login page and action now exist (`app/platform/login/`) and are covered by typecheck/lint/build/CI; the actual login flow has not yet been exercised by hand with a real platform-admin account, and no automated E2E test exists yet (see note below)
- [ ] Platform-role authorization matrix E2E — unit-level coverage exists (`tests/unit/platform-authorization.test.ts`); no E2E yet
- [ ] Cross-tenant access-denial tests
- [ ] Provisioning/lifecycle action tests
- [ ] Residency/datastore control tests
- [ ] Maintenance/suspension authorization tests
- [ ] Audit-event completeness tests
- [ ] High-risk action confirmation/step-up tests — unit-level coverage exists; no E2E yet
- [ ] Break-glass controls tested if implemented
- [ ] Sensitive-data minimization and no-secret-leak tests
- [ ] Accessibility and responsive UX verification

> **Update 2026-09-17:** the Platform Control surface now has a complete
> UI — Overview, Tenants list, Tenant detail, Audit, and Login pages
> (`app/platform/`, `src/components/platform/`), built on the workspace
> design system with a deliberate amber accent distinguishing it from
> clinic staff sessions. Typecheck, full unit suite, lint, and
> production build all pass with all five routes compiled, including
> `/platform/login`. **This confirms the code compiles and builds
> correctly — it does not confirm the login flow actually works.** No
> one has yet signed in through this UI with a real platform-admin
> account and confirmed a session is created, the redirect to
> `/platform` succeeds, and the four authenticated pages render real
> data end-to-end. That manual pass, and the E2E tests listed above,
> remain the next real gate before this surface can be called
> release-ready.

## 9. Clinic application / dashboard UX
- [x] Missing-user placeholder normalized to `User`
- [x] Heri CMS branding applied to authenticated workspace shell
- [x] Responsive shell CSS
- [ ] Final production deployment verification
- [ ] Navigation labels and permission-aware rendering
- [ ] Empty/loading/error states
- [ ] Accessibility verification

> **UI scope note:** The remaining clinic/dashboard UX work is intentionally deferred because it is being handled separately from this production-hardening track.

## 10. Core clinic workflows
- [x] Core modules exist: Patients, Visits, Pharmacy, Accounts, Reports and Help
- [ ] Patient workflow E2E
- [ ] Visit workflow E2E
- [ ] Pharmacy/medicine workflow E2E
- [ ] Accounts/payment-data workflow E2E
- [ ] Reporting workflow E2E
- [ ] Permission-boundary verification for every workflow
- [ ] Sensitive operation audit verification — **status as of 2026-09-17**: write operations (create/update) across Patient, Visit, Prescription, Payment, Pharmacy and Accounts were already audited. A direct sweep of every `get`/`list`/`search` function in `src/lib/` (not just the ones suspected — all of them, function body read individually) found six *read* paths exposing patient-identifying or clinical data with no audit event: `getVisit`, `getVisitPrescriptions`, `listPharmacyPrescriptions`, `listInvoices`, `listBillableVisits`, `listVisits`. Fixes for all six are written and pending PR (`feat/patient-record-read-audit-logging`, not yet merged). Two functions were checked and confirmed correctly aggregate-only already (`getAccountsSummary`, `getDashboardMetrics` — counts/sums only, no individual record ever returned). No app/ page or API route was found to bypass this registry layer and query these tables directly — confirmed by a repo-wide search for `db.patient.`/`db.visit.`/`db.prescription.`/`db.invoice.` outside `src/lib/`. **Not yet done**: automated tests asserting each of the six fixes actually fires its audit event.
- [ ] Verify each module stays within the HeriCMS patient-registry/operations data boundary

## 11. Production database and deployment configuration
- [x] Successful Vercel deployment evidence exists for corrected trial implementation
- [ ] Production Prisma migration applied
- [ ] Production DB connection verified
- [ ] Required production environment variables verified
- [ ] No development/test credentials in production
- [ ] Production secrets use deployment secret mechanism
- [ ] Backups enabled and tested
- [ ] Production domain/aliases verified
- [ ] Cache/no-store behavior verified for sensitive routes
- [ ] Restore/rollback runbook tested, not merely documented

## 12. Observability and incident response
- [x] Audit infrastructure
- [x] Operations/incident/backup/maintenance/rollback documentation
- [ ] Application error monitoring
- [ ] Platform/datastore health monitoring
- [ ] Authentication/security event monitoring
- [ ] Auth-failure/rate-limit alerts
- [ ] Datastore degradation alerts
- [ ] Migration/provisioning failure alerts
- [ ] Backup failure alerts
- [ ] Cross-tenant authorization anomaly alerts
- [ ] Incident-response drill
- [ ] Log retention/access controls
- [ ] No secrets/passwords/unsafe patient data in logs
- [ ] Payment-integration ingestion/reconciliation health monitoring
- [ ] Offline sync failure/conflict monitoring once sync is implemented

## 13. Application security, XSS and abuse resistance
- [ ] Security headers verified in production
- [ ] Content Security Policy (CSP) implemented and tested
- [ ] `X-Content-Type-Options` configured
- [ ] Appropriate `Referrer-Policy`
- [ ] Appropriate frame protection / `frame-ancestors`
- [ ] User-controlled HTML sanitized where rich text is intentionally supported
- [ ] No unjustified `dangerouslySetInnerHTML` or equivalent unsafe rendering
- [ ] URL/link validation for user-controlled destinations
- [ ] File/SVG upload XSS controls if uploads exist
- [ ] Stored XSS tests
- [ ] Reflected XSS tests
- [ ] DOM XSS tests
- [ ] Dependency vulnerability scan
- [ ] Secret scanning
- [ ] SAST/security linting appropriate to the stack
- [ ] Abuse-case review for authentication, exports and administrative actions
- [ ] Independent penetration/security assessment before high-risk launch or according to risk schedule

## 14. Data export, download and exfiltration controls
- [ ] Admin data-export feature designed with least privilege
- [ ] Export types and allowed roles explicitly defined
- [ ] Server-side clinic/tenant authorization on export queries
- [ ] Server-side validation of filters/date ranges
- [ ] No patient/sensitive data in export URLs
- [ ] Export files encrypted at rest where applicable
- [ ] Downloads use short-lived authorized signed URLs/tokens
- [ ] Export files automatically expire/delete according to retention policy
- [ ] Re-authentication/step-up MFA for high-risk exports where appropriate
- [ ] Every export request recorded in audit trail
- [ ] Every successful download recorded with user, clinic, export type, timestamp and result
- [ ] Security-relevant failed/denied export attempts recorded
- [ ] Export record includes requestor identity/role, scope/filter, record count and export identifier
- [ ] Cross-tenant export isolation E2E tests
- [ ] Export/download audit events are tamper-evident and access-controlled
- [ ] Authorized clinic administrators/auditors can review export/download history
- [ ] Export/backup copies obey residency, retention and deletion controls
- [ ] Interoperability exports use explicit FHIR/OpenMRS/KHIS mappings where applicable

## 15. M-Pesa/payment-data integration and immutable financial records

> **Critical architecture rule:** Heri CMS does **not** receive, settle, or fabricate M-Pesa payments. Patients pay the clinic through the clinic's authoritative M-Pesa/payment system. Heri CMS is a trusted visibility/integration layer: it receives verified payment events/data from the authoritative source and presents the same verified dataset to authorized Accounts users and the admin dashboard.

### 15.1 Source of truth and ingestion
- [ ] Authoritative M-Pesa/payment source explicitly defined
- [ ] **Daraja API integration contract documented for patient payments**
- [ ] Integration API/event contract documented
- [ ] Source event authentication/signature/checksum mechanism verified where provided
- [ ] TLS and integration secrets verified
- [ ] Idempotent ingestion
- [ ] Unique M-Pesa transaction/reference IDs enforced
- [ ] Replay/duplicate event protection
- [ ] Out-of-order event handling
- [ ] Failed/retried event handling
- [ ] Reconciliation against authoritative payment source

### 15.2 Clinic subscription billing
- [ ] Clinic subscription billing is a separate payment domain from patient payments
- [ ] **STK Push flow implemented for clinic subscription billing**
- [ ] Subscription payment request has idempotent billing/reference identity
- [ ] STK callback/result is authenticated and validated
- [ ] Subscription entitlement changes only after authoritative payment confirmation
- [ ] Duplicate/replayed callbacks cannot extend or alter entitlement incorrectly
- [ ] Failed/expired/cancelled STK requests have deterministic states
- [ ] Subscription billing reconciliation exists against the authoritative payment source
- [ ] Subscription payment records are immutable/auditable

### 15.3 Insurance co-pay collection
- [ ] Insurance co-pay collection model defined if enabled
- [ ] Coverage/claim/co-pay responsibility is separated from patient payment facts
- [ ] Co-pay payment references can be linked to the relevant patient/account/encounter context without overwriting source facts
- [ ] Insurer/payment-source reconciliation defined
- [ ] Co-pay reversals/adjustments follow immutable financial-record rules

### 15.4 Immutable Accounts / financial ledger
- [ ] **Accounts financial records are immutable by clinic users and administrators**
- [ ] No UI/API permits editing or deleting an original M-Pesa transaction fact
- [ ] No client can alter transaction amount, status, transaction ID/reference, timestamp or payer reference
- [ ] Server-side authorization independently prevents financial-record mutation
- [ ] Database constraints/architecture protect against unauthorized mutation
- [ ] Payment facts are append-only or otherwise cryptographically/audit protected against tampering
- [ ] Corrections are represented as controlled adjustment/reconciliation events, never by overwriting the original fact
- [ ] Original transaction remains permanently visible with its original source values subject to lawful retention policy
- [ ] Any adjustment/reconciliation references the original transaction and records reason, actor/system, timestamp and evidence
- [ ] Audit trail for financial records is tamper-evident and access-controlled

### 15.5 Reversals and lifecycle
- [ ] **M-Pesa reversal is represented as a reversal event/status, not deletion or alteration of the original transaction**
- [ ] Original payment remains visible after reversal
- [ ] Reversal clearly identifies the affected original transaction
- [ ] Reversal timestamp/reference/reason are preserved when supplied by the authoritative source
- [ ] Accounts balance/ledger reflects the reversal through an explicit immutable adjustment
- [ ] Reversed transactions cannot silently return to `SUCCESS`
- [ ] Duplicate/replayed reversal events are idempotent
- [ ] Reconciliation detects missing, conflicting or unexpected reversals
- [ ] UI clearly distinguishes original payment, reversal and current reconciled state

### 15.6 Consultation and pharmacy payments
- [ ] Consultation-fee M-Pesa payments represented from verified source data
- [ ] Pharmacy/medicine M-Pesa payments represented from verified source data
- [ ] Payment-to-patient/invoice/visit linkage is server-authorized
- [ ] Pharmacy payment data cannot be substituted for consultation payment data or vice versa
- [ ] The Accounts view and admin dashboard consume the same verified payment dataset
- [ ] No parallel/fabricated client-side payment source of truth

### 15.7 Live updates
- [ ] **Server-Sent Events (SSE) implemented as the initial live payment-update mechanism**
- [ ] SSE authentication and tenant authorization verified
- [ ] SSE stream cannot expose another clinic's payment events
- [ ] **Polling fallback implemented** when SSE disconnects/is unavailable
- [ ] Reconnect/replay behavior prevents missed or duplicated UI events
- [ ] Live update events cause the client to refresh/reconcile against the authoritative payment dataset
- [ ] Payment events remain auditable regardless of live-delivery mechanism

## 16. Testing and release validation
- [x] Release candidate SHA `af690c6eb433729cbf8f6f2a2411255bca4f5c37` passed lint/typecheck/unit/build/Playwright in Actions run #36
- [x] Successful Vercel deployment evidence for corrected trial implementation
- [x] Rerun CI evidence after subsequent tenant-architecture changes — PR #17 (`0e8f09a`) fixed a stale `TenantIsolationMode` enum reference blocking `typecheck`; PR #16 added real Postgres provisioning to the `e2e` job and fixed two latent Prisma raw-query type mismatches in `computeAuditEntryHash` (bigint vs INTEGER for `sequence`, text vs TIMESTAMPTZ for `createdAt`) that unit tests never caught because `tests/audit/audit.test.ts` mocks the database entirely — first fully green `test` + `e2e` run on `main`.
- [ ] Unit-test coverage on raw-SQL call sites (`src/lib/audit.ts` and any future `$queryRaw`/`$executeRaw` usage) does not catch Postgres type-binding mismatches, since mocked queries never touch a real database — consider a lightweight integration suite against real Postgres for these.
- [ ] Production-like signup/login/expiry flows
- [ ] Critical clinic workflow E2E
- [ ] Tenant isolation/cross-tenant denial E2E
- [ ] MFA/authentication/security E2E
- [ ] Secure cookie/session verification
- [ ] Export/download authorization and isolation tests
- [ ] XSS/security testing
- [ ] Daraja patient-payment integration tests
- [ ] Subscription STK Push tests
- [ ] Insurance co-pay tests if enabled
- [ ] Immutable financial mutation-attempt tests
- [ ] Payment reversal tests
- [ ] Duplicate/replay/out-of-order payment event tests
- [ ] SSE and polling fallback tests
- [ ] Offline outbox/sync/conflict tests once implemented
- [ ] FHIR/OpenMRS/KHIS interoperability mapping tests
- [ ] Platform Control E2E/authz/security/audit tests
- [ ] No sensitive output in browser/API/log/test artifacts

## 17. Legal, privacy and compliance
- [x] Kenya-first residency/privacy policy research and architectural controls documented
- [ ] Formal legal/privacy review and sign-off — **specific question to bring to counsel first**, per 2026-09-17 research: given the production database's confirmed hosting country/provider, does Digital Health Act Section 47 restrict the current architecture, and if so what's the fastest compliant path? This single question reshapes several other items below and should be answered before broader legal review, not alongside it.
- [ ] Controller/processor responsibilities defined — HeriCMS most likely qualifies as the data controller for its own operational/administrative data and as processor for clinic patient data under DPA section 5's general test, per the Digital Health Act's explicit accommodation of this model (Act text: "the clinic is the data controller for patient-related information and the platform provider may act as a data processor") — needs counsel confirmation, not assumed.
- [ ] Subprocessor inventory and contractual safeguards
- [ ] Retention/deletion schedule — **Digital Health Act requires 20-year minimum retention of health data.** Build the policy around this floor; do not default to a deletion-first design.
- [ ] Data-subject/request handling procedures — note the DPA distinguishes *correction* (7-day response window, general regulations) from *deletion*; a correction/rectification flow is buildable now and does not wait on the retention-policy question, unlike deletion.
- [ ] Incident/breach procedures — **specific deadlines, not general practice**: Digital Health Agency CEO notification within 48 hours of becoming aware of a breach, corrective-measures detail within a further 72 hours; separately, ODPC notification within 72 hours under the general DPA rule. No procedure meeting these specific windows currently exists.
- [ ] Cross-border transfer assessment and controls
- [ ] Evidence retention policy
- [ ] Patient-registry export/disclosure policy
- [ ] Payment-data provenance and accuracy responsibilities documented
- [ ] Financial immutability/reversal policy documented
- [ ] Daraja/payment-provider contractual and operational requirements verified
- [ ] Insurance co-pay responsibilities documented if enabled
- [ ] Interoperability/data-sharing responsibilities for KHIS/OpenMRS/FHIR integrations documented
- [ ] **ODPC registration as a data controller/processor** — confirmed not yet done as of 2026-09-17; this is an administrative/legal action, not an engineering task, and can start immediately/in parallel with everything else on this list.
- [ ] **Digital Health Agency notification** (required within 7 days of ODPC registration, per the Digital Health Act) — blocked by the item above.
- [ ] **Digital Health Certification for Safer Healthcare** — the actual named DHA certification program (graded scale from "compliant" to "future ready"); deliberately deferred until the items above are substantially resolved, not a near-term action.

## 18. Release gate
Production release remains blocked until all applicable critical evidence is complete, including:
- production database/configuration, backups and restore evidence;
- secure authentication/session controls;
- verified tenant isolation and datastore lifecycle controls;
- Kenya-first residency/privacy evidence;
- export/download controls;
- application security/XSS/abuse assessment;
- observability and incident-response readiness;
- Platform Control privileged boundary, authorization and auditability where applicable;
- **Daraja/payment provenance, immutable financial records, reversals and reconciliation where payment visibility/billing is enabled**;
- **offline-first synchronization/conflict controls for any workflow advertised as offline-capable**;
- **interoperability mapping validation for supported FHIR/OpenMRS/KHIS integrations**;
- legal/privacy/compliance sign-off;
- final functional and security validation evidence.

> **Current strategic direction:** Start with shared-schema multi-tenancy for cost efficiency, while preserving a storage-mode abstraction that allows a tenant to move to schema-per-tenant or database-per-tenant when scale, contractual requirements or data-sovereignty expectations justify the operational cost. This decision is intentionally made before broad clinic onboarding.
