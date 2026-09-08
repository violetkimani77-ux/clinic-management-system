# Heri CMS — Production Readiness Checklist

**Product:** Heri CMS / HeriCMS — Clinic Management System  
**Purpose:** Single source of truth for the work required before declaring the platform production-ready.  
**Naming:** The current product name is **Heri CMS / HeriCMS**. **Hali CMS** is the former name and must not be used for new product-facing copy, UI, metadata, or documentation except where historical context is necessary.

## Status legend
- [x] **Done** — implemented and verified with evidence
- [~] **In progress** — implementation exists but still needs completion or verification
- [ ] **Not started** — agreed work has not been implemented

> **Release rule:** A successful Vercel build/deployment alone does not equal production readiness. Production readiness requires functional application flow, production database/configuration verification, security checks, secure sessions, tenant isolation, Kenya-first residency/privacy controls, data-export controls, payment-data integrity, backups/restore, observability, and validation evidence.

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
- [x] Login rate limiting
- [x] MFA infrastructure
- [x] RBAC and entitlement checks
- [x] Suspended/disabled users rejected server-side
- [x] Session expiry/revocation server-side
- [ ] E2E MFA verification
- [ ] Authorization matrix verified for every module/action
- [ ] Realistic brute-force/rate-limit verification
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
- [ ] Actual production DB geography verified
- [ ] Backup/DR geography verified
- [ ] Provider/subprocessor geography verified
- [ ] Operational residency validation with evidence
- [ ] Transfer assessment workflow
- [ ] Consent/legal-basis verification where applicable
- [ ] Residency/transfer evidence retention
- [ ] Analytics/monitoring/support tooling checked for identifiable health-data export
- [ ] Provider contractual safeguards/DPA requirements verified
- [ ] Breach/deletion/retention/legal-request procedures verified

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

## 8. Heri CMS Platform Control

### 8.1 Platform Control Panel purpose and boundary
- [ ] Separate platform control surface implemented
- [ ] Platform Control is a privileged platform-operations boundary, separate from the clinic application/dashboard
- [ ] Platform admins cannot be treated as ordinary clinic users with an implicit “super-admin” bypass
- [ ] Platform metadata/operations are separated from clinic clinical data access
- [ ] Platform Control does not automatically grant unrestricted patient-record access
- [ ] Any break-glass clinical-data access requires explicit authorization, business justification, time-bounded access and audit evidence

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
- [ ] Clinic/tenant detail pages expose operational context without unnecessarily exposing clinical records
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
- [ ] Platform administration authentication with MFA enforced
- [ ] Separate platform-admin authorization model from clinic RBAC
- [ ] Least-privilege platform roles defined
- [ ] Step-up authentication for dangerous operations
- [ ] Secure session expiry, rotation and revocation for platform-admin sessions
- [ ] Platform-admin sessions use secure cookie/session controls
- [ ] Cross-tenant data leakage prevention tested
- [ ] Tenant impersonation is disabled by default; if ever enabled, it requires explicit authorization, strong visual indication, time limit and complete audit trail
- [ ] Destructive/irreversible operations are protected against accidental or replayed execution
- [ ] Emergency/break-glass controls are restricted, justified, time-bounded and audited

### 8.5 Platform Control auditability and operations
- [ ] Every provisioning, suspension, migration, residency, maintenance and security-sensitive administrative action produces an audit event
- [ ] Audit records include actor, role, tenant/scope, action, timestamp, outcome and relevant target/reference
- [ ] Audit records are tamper-evident and access-controlled
- [ ] Platform admins can review audit history without editing or deleting audit evidence
- [ ] Security alerts have ownership, severity, status and resolution/evidence workflow
- [ ] Operational failures expose actionable diagnostics without leaking secrets or patient-sensitive data
- [ ] Platform health checks and alerts have documented response procedures
- [ ] Platform Control actions have authorization and negative-path tests, not only happy-path tests

### 8.6 Platform Control Panel release tests
- [ ] Platform-admin login/MFA E2E
- [ ] Platform-role authorization matrix E2E
- [ ] Cross-tenant access-denial tests
- [ ] Provisioning/lifecycle action tests
- [ ] Residency/datastore control tests
- [ ] Maintenance/suspension authorization tests
- [ ] Audit-event completeness tests
- [ ] High-risk action confirmation/step-up tests
- [ ] Break-glass controls tested if implemented
- [ ] Sensitive-data minimization and no-secret-leak tests
- [ ] Accessibility and responsive UX verification

> The Platform Control surface is not currently an existing UI and must not be represented as available until implemented and verified.

## 9. Clinic application / dashboard UX
- [x] Missing-user placeholder normalized to `User`
- [x] Heri CMS branding applied to authenticated workspace shell
- [x] Responsive shell CSS
- [ ] Final production deployment verification
- [ ] Navigation labels and permission-aware rendering
- [ ] Empty/loading/error states
- [ ] Accessibility verification

## 10. Core clinic workflows
- [x] Core modules exist: Patients, Visits, Pharmacy, Accounts, Reports and Help
- [ ] Patient workflow E2E
- [ ] Visit workflow E2E
- [ ] Pharmacy/medicine workflow E2E
- [ ] Accounts/payment-data workflow E2E
- [ ] Reporting workflow E2E
- [ ] Permission-boundary verification for every workflow
- [ ] Sensitive operation audit verification

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

## 15. M-Pesa/payment-data integration and immutable financial records

> **Critical architecture rule:** Heri CMS does **not** receive, settle, or fabricate M-Pesa payments. Patients pay the clinic through the clinic's authoritative M-Pesa/payment system. Heri CMS is a trusted visibility/integration layer: it receives verified payment events/data from the authoritative source and presents the same verified dataset to authorized Accounts users and the admin dashboard.

### 15.1 Source of truth and ingestion
- [ ] Authoritative M-Pesa/payment source explicitly defined
- [ ] Integration API/event contract documented
- [ ] Source event authentication/signature/checksum mechanism verified where provided
- [ ] TLS and integration secrets verified
- [ ] Idempotent ingestion
- [ ] Unique M-Pesa transaction/reference IDs enforced
- [ ] Replay/duplicate event protection
- [ ] Out-of-order event handling
- [ ] Failed/retried event handling
- [ ] Reconciliation against authoritative payment source

### 15.2 Immutable Accounts / financial ledger
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

### 15.3 Reversals and lifecycle
- [ ] **M-Pesa reversal is represented as a reversal event/status, not deletion or alteration of the original transaction**
- [ ] Original payment remains visible after reversal
- [ ] Reversal clearly identifies the affected original transaction
- [ ] Reversal timestamp/reference/reason are preserved when supplied by the authoritative source
- [ ] Accounts balance/ledger reflects the reversal through an explicit immutable adjustment
- [ ] Reversed transactions cannot silently return to `SUCCESS`
- [ ] Duplicate/replayed reversal events are idempotent
- [ ] Reconciliation detects missing, conflicting or unexpected reversals
- [ ] UI clearly distinguishes original payment, reversal and current reconciled state

### 15.4 Consultation and pharmacy payments
- [ ] Consultation-fee M-Pesa payments represented from verified source data
- [ ] Pharmacy/medicine M-Pesa payments represented from verified source data
- [ ] Payment-to-patient/invoice/visit linkage is server-authorized
- [ ] Pharmacy payment data cannot be substituted for consultation payment data or vice versa
- [ ] The Accounts view and admin dashboard consume the same verified payment dataset
- [ ] No parallel/fabricated client-side payment source of truth

### 15.5 Live updates
- [ ] **Server-Sent Events (SSE) implemented as the initial live payment-update mechanism**
- [ ] SSE authentication and tenant authorization verified
- [ ] SSE stream cannot expose another clinic's payment events
- [ ] **Polling fallback implemented** when SSE disconnects/is unavailable
- [ ] Reconnect/replay behavior prevents missed or duplicated UI events
- [ ] Live update events cause the client to refresh/reconcile against the authoritative Heri CMS record rather than trusting event payloads as permanent truth
- [ ] Real-time notification is never the authoritative payment record
- [ ] UI handles pending, successful, failed, cancelled, delayed and reversed states without inventing success
- [ ] Ingestion lag and stale-data indicators are available where operationally necessary

### 15.6 Monitoring and reconciliation
- [ ] Alerts for ingestion failures
- [ ] Alerts for ingestion lag/stale payment data
- [ ] Alerts for duplicate/replay events
- [ ] Alerts for integrity/authentication failures
- [ ] Alerts for reconciliation mismatches
- [ ] Operational reconciliation procedure and evidence retention
- [ ] Payment-data access and reconciliation activity audited
- [ ] Test fixtures cannot be mistaken for production payment data

## 16. Testing and release validation
- [x] Current HEAD `af690c6` passed lint, typecheck, unit tests, build and Playwright E2E in GitHub Actions run #36
- [ ] Re-run/record validation whenever release SHA changes
- [ ] Tenant-isolation E2E suite
- [ ] Production-like signup/login/expiry E2E
- [ ] Full critical-workflow E2E
- [ ] MFA E2E
- [ ] Secure-session-cookie E2E/security assertions
- [ ] Export/download E2E with audit assertions
- [ ] XSS/security regression suite
- [ ] M-Pesa/payment-data ingestion/reconciliation tests
- [ ] Immutable Accounts mutation-attempt tests
- [ ] M-Pesa reversal lifecycle tests
- [ ] Duplicate/replay/out-of-order payment-event tests
- [ ] SSE live-update tests
- [ ] Polling fallback tests
- [ ] Platform Control Panel E2E and authorization/security/audit tests
- [ ] Verify no secrets/passwords/patient-sensitive data in test output

## 17. Legal, privacy and compliance operational readiness
- [x] Kenya-first residency/privacy policy/research documented
- [ ] Final legal/compliance review
- [ ] Controller/processor responsibilities documented
- [ ] Subprocessor register
- [ ] Retention/deletion schedule
- [ ] Data-subject request process
- [ ] Incident/breach process
- [ ] Cross-border transfer assessment
- [ ] Evidence-retention policy
- [ ] Customer-facing privacy/data-residency disclosures
- [ ] Data export/download policy aligned with privacy/contractual obligations
- [ ] Payment-data provenance/accuracy responsibilities documented with authoritative payment provider/system
- [ ] Financial-record immutability and reversal policy documented

## 18. Release gate
Production release is blocked until all applicable critical controls have verified evidence:
- [ ] Current release SHA passes typecheck, lint, unit tests, production build and critical E2E
- [ ] Tenant isolation verified
- [ ] Authentication/MFA/secure-session-cookie security verified
- [ ] XSS/application-security controls verified
- [ ] Production DB/config/secrets verified
- [ ] Kenya residency and provider/backup geography verified
- [ ] Backups and restore verified
- [ ] Observability and incident response operational
- [ ] Data export/download controls and audit trail verified
- [ ] **Platform Control Panel architecture, privileged security boundary, authorization, auditability and critical UX tests verified**
- [ ] **M-Pesa payment-data provenance, immutability, reversal handling, live updates and reconciliation verified** when payment visibility is enabled
- [ ] Legal/compliance sign-off completed
- [ ] Final production smoke test completed

## Current known release evidence
- **Release candidate SHA:** `af690c6eb433729cbf8f6f2a2411255bca4f5c37`
- **GitHub Actions CI:** run #36 completed successfully
- **CI:** lint, typecheck, unit tests and production build passed
- **Playwright:** E2E job passed
- **Vercel:** successful deployment evidence exists, but deployment success is not itself the production gate.
