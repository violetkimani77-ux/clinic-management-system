# Security, Privacy and Compliance Implementation Checklist

This checklist is an engineering and operational control register. It is not legal advice or a compliance certification. Kenyan operations use the Kenya Data Protection Act and ODPC requirements as the primary legal baseline. HIPAA controls apply when a deployment/customer is actually within HIPAA scope. NIST CSF 2.0 is the engineering risk-management framework.

## 1. Regulatory scope and accountability

- [ ] Maintain a documented controller/processor/sub-processor determination for every customer and integration.
- [ ] Complete Kenya Data Commissioner registration assessment and maintain evidence of registration where required.
- [ ] Treat health administration/patient-care processing as requiring special attention to registration obligations.
- [ ] Designate and document a Data Protection Officer where required; publish the required contact details.
- [ ] Maintain customer data-processing agreements and processor/sub-processor terms.
- [ ] Document HIPAA applicability per customer; execute BAAs where required.
- [ ] Maintain a regulatory register covering Kenya DPA, applicable healthcare/digital-health requirements, HIPAA where applicable, and contractual obligations.

## 2. DPIA and risk management

- [ ] Complete and approve a Data Protection Impact Assessment before production processing of material health data.
- [ ] Record processing purpose, lawful basis, data categories, subjects, recipients, retention, risks, safeguards, residual risk, and approval.
- [ ] Reassess the DPIA for new high-risk processing, major architecture changes, new regions, biometric/genetic processing, AI, or materially new integrations.
- [ ] Maintain a security risk register and treatment plan.
- [ ] Review risks periodically and after material incidents or changes.

## 3. Data inventory and flow mapping

- [ ] Inventory every patient, clinical, financial, authentication, audit, and operational data field.
- [ ] Map collection -> processing -> storage -> access -> export -> deletion for each category.
- [ ] Identify every processor, cloud service, integration, backup target, log sink, and support channel.
- [ ] Label sensitive health data and authentication secrets explicitly.
- [ ] Keep PHI/ePHI out of platform-control-plane records wherever possible.

## 4. Tenant isolation

- [x] Every clinic business record carries a clinic boundary in the pooled model.
- [x] Server-side authorization verifies clinic membership.
- [x] Explicit tenant assertion helper exists.
- [ ] Add automated horizontal tenant-attack tests across patient, visit, prescription, pharmacy, invoice, payment, expense, report, and audit APIs.
- [ ] Add direct-URL and direct-API authorization tests.
- [ ] Add negative tests for forged/tampered clinic identifiers.
- [ ] Introduce PostgreSQL RLS only with an explicit tenant context mechanism, a dedicated DB role, and `FORCE ROW LEVEL SECURITY` where required.
- [x] Define pool/bridge/silo isolation modes in the platform data model.

## 5. Multi-clinic identity context

- [x] A single-membership user can be scoped automatically.
- [x] A multi-membership user must explicitly select a clinic after password verification.
- [x] Selected clinic membership is validated server-side.
- [x] MFA challenge is bound to the selected clinic.
- [x] Session is bound to the selected clinic.
- [ ] Add automated tests for unauthorized clinic selection and session tampering.

## 6. Identity, authentication and authorization

- [x] Password verification is server-side.
- [x] MFA is enforced before session creation.
- [x] MFA secrets are encrypted at rest and recovery codes are hashed.
- [x] Generic authentication errors reduce account enumeration.
- [x] Login rate limiting and account lockout controls exist.
- [x] Sessions use hashed tokens, absolute expiry, idle timeout, and membership revalidation.
- [ ] Add session revocation/device/session management UI and tests.
- [ ] Add stronger MFA recovery workflow and recovery-code regeneration audit events.
- [ ] Add platform-level identity and roles separate from clinic ADMIN.

## 7. Minimum necessary access

- [x] Clinic roles map to explicit permission sets.
- [ ] Review every permission against real job duties.
- [ ] Add field-level redaction for data not needed by pharmacy/accounts roles.
- [ ] Add break-glass access only if clinically/business justified, with mandatory reason and enhanced audit.
- [ ] Review support access for least privilege and time-bound elevation.

## 8. Auditability and evidence

- [x] Audit logs are clinic-scoped and tamper-evident.
- [ ] Audit authentication events, MFA events, privilege changes, exports, sensitive-record reads, billing changes, stock adjustments, and administrative actions consistently.
- [ ] Define audit retention and legal hold policy.
- [ ] Centralize operational/security logs without copying unnecessary health data.
- [ ] Protect audit-log storage from ordinary application-user modification.
- [ ] Add audit integrity verification jobs and alerting.

## 9. Data integrity and clinical safety

- [x] Critical workflows use transactions.
- [x] Clinical and financial records avoid hard deletion.
- [x] Pharmacy inventory uses batches and expiry data.
- [ ] Add explicit reversal/void workflows and approval rules for financial corrections.
- [ ] Add concurrency tests for dispensing, stock, payments, and invoice updates.
- [ ] Add idempotency and replay tests for future payment-provider webhooks.

## 10. Encryption and secrets

- [x] Authentication secrets are hashed or encrypted rather than stored as plaintext.
- [ ] Require TLS for all production database connections and service-to-service communication.
- [ ] Enforce encryption at rest for managed databases, backups, object storage, and log stores.
- [ ] Store database credentials/API keys only in a managed secret store.
- [ ] Rotate application/database credentials and encryption keys under a documented procedure.
- [ ] Document key ownership, rotation, recovery, and revocation.

## 11. Breach response

- [ ] Maintain a documented incident-response plan with severity levels, roles, escalation, evidence preservation, containment, eradication, recovery, and communications.
- [ ] Define processor-to-controller breach notification timing and controller/regulator notification procedures separately.
- [ ] Maintain an incident register and post-incident corrective-action record.
- [ ] Run tabletop exercises at least annually and after major architecture changes.
- [ ] Ensure security logs and backups remain available during incident investigation.

## 12. Cross-border transfer and residency

- [ ] Maintain a data-region register for production, backups, logs, analytics, support, and subprocessors.
- [ ] Identify every cross-border transfer.
- [ ] Document the legal mechanism and safeguards for each transfer.
- [ ] Obtain any required consent/confirmation for sensitive-data transfers where applicable.
- [ ] Add customer-selectable region policy to enterprise onboarding.

## 13. Data-residency architecture

- [x] Tenant datastore registry records isolation mode, region, migration version, and secret reference.
- [x] Pool/bridge/silo modes are explicit platform concepts.
- [ ] Implement infrastructure provisioning for bridge/silo databases.
- [ ] Implement datastore health checks and migration orchestration.
- [ ] Add tested tenant-data migration between isolation modes.
- [ ] Add regional routing and residency enforcement before selling region-specific hosting.

## 14. Vendor and processor management

- [ ] Maintain a processor/subprocessor register.
- [ ] Review security, privacy, breach, retention, deletion, residency, and subprocessors terms before onboarding vendors.
- [ ] Require contractual security commitments appropriate to the data processed.
- [ ] Track vendor risk reviews and renewal dates.

## 15. Backup, disaster recovery and ransomware resilience

- [ ] Encrypted automated backups.
- [ ] Point-in-time recovery where supported.
- [ ] Cross-region or logically separate recovery copy according to residency constraints.
- [ ] Document RPO/RTO targets per customer tier.
- [ ] Test restore procedures regularly and retain evidence.
- [ ] Protect backups from application credentials and ransomware-style deletion.
- [ ] Test tenant-specific restore without cross-tenant data exposure.

## 16. Vulnerability management

- [ ] Dependency scanning on every pull request.
- [ ] Lockfile integrity and review of transitive security advisories.
- [ ] OS/container patching schedule.
- [ ] Critical security patch emergency path outside normal maintenance windows.
- [ ] Document remediation SLAs by severity.

## 17. Penetration testing and security validation

- [ ] Pre-production application penetration test.
- [ ] Multi-tenant horizontal isolation test.
- [ ] Vertical privilege-escalation test.
- [ ] Authentication/MFA/rate-limit abuse testing.
- [ ] API authorization and direct-object-reference testing.
- [ ] Session/token/cookie security testing.
- [ ] Database and backup access-control testing.
- [ ] Remediate findings and retain the report and evidence.

## 18. Secure SDLC

- [x] TypeScript type checking and automated tests.
- [x] Playwright browser smoke test.
- [ ] CI should run unit, integration, E2E, dependency, migration, and security checks before merge.
- [ ] Require review for security-sensitive code and migrations.
- [ ] Protect main branch and require passing checks.
- [ ] Maintain rollback procedures and migration rollback plans.
- [ ] Maintain a release changelog and security advisory process.

## 19. Platform control plane, pricing and entitlements

- [x] Platform user roles are separate from clinic roles in the data model.
- [x] Custom quote lifecycle exists without a payment-provider dependency.
- [x] Subscription lifecycle supports setup, trial, active, grace, past-due, suspended, cancelled, and expired states.
- [x] Tenant datastore lifecycle is explicit.
- [x] Central maintenance-window model exists.
- [ ] Add platform admin screens and server-side platform authorization.
- [ ] Enforce subscription entitlements in clinic route/API guards.
- [ ] Build manual quote acceptance/activation workflow.
- [ ] Add verified payment webhooks only when a provider is selected.

## 20. Public engineering references

Public GitHub repositories are used only as implementation references. They are not compliance authorities and their security claims are not treated as evidence. Review patterns from EHR/HMS projects for RBAC, testing, pharmacy, billing, audit, Prisma, Next.js, and deployment practices, then validate each pattern against this project's threat model and legal obligations.

## 21. Go-live gate

A production release is blocked until all mandatory legal, security, privacy, data-isolation, backup/restore, incident-response, and testing controls are either implemented or formally accepted as residual risk by the authorized owner. Evidence must be stored with the release record.

## Evidence register

For every completed control, retain enough evidence to reproduce the conclusion: code/commit, test output, configuration, migration, policy, signed agreement, risk acceptance, audit report, or exercise record.
