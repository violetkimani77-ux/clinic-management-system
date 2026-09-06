# Clinic Management System Architecture

## Product boundary

This is an internal clinic management system. It is not a CRM and has no patient-facing portal, patient login, public booking, or patient mobile application in the MVP.

## Architecture

Use a modular monolith with a centralized control plane and clinic data planes.

- One Next.js application and one PostgreSQL pool are the default deployment model.
- Clinic data is always clinic-scoped and authorization is enforced server-side.
- The tenant data layer is designed to support three isolation modes without changing clinic business modules:
  - `POOL`: multiple clinics share the application database.
  - `BRIDGE_DATABASE`: a clinic receives a separate database on shared managed infrastructure.
  - `SILO_DATABASE`: a clinic receives a dedicated database/stack for contractual, regulatory, regional, or enterprise isolation requirements.
- The control plane stores tenant metadata, isolation mode, datastore status, quote/subscription state, and secret-manager references. It must not store clinic database passwords or patient/clinical data.
- A tenant datastore record contains a secret-manager reference rather than credentials. Actual provisioning is an infrastructure operation, not an application-side database-password feature.

Modules:

- Auth
- Clinics and memberships
- Platform control plane
- Users, roles, permissions
- Patients
- Visits
- Pharmacy
- Inventory
- Billing
- Payments
- Expenses
- Reporting
- Audit
- Settings

## Core principles

1. One shared patient record per clinic.
2. Multi-tenancy is enforced at the data and authorization layers.
3. Roles are collections of permissions; authorization is not hard-coded into UI pages.
4. Backend authorization is mandatory even when UI controls are hidden.
5. Dashboard metrics are derived from source business records.
6. Critical workflows use database transactions.
7. Payment processing is idempotent.
8. Pharmacy stock uses batches and expiry dates, with FEFO dispensing.
9. Important clinical and financial records are not hard-deleted. Use status, void, reversal, archive, and audit mechanisms as appropriate.
10. Sensitive actions create immutable audit events.
11. Each module owns its business rules while cross-module effects use explicit application/domain events.
12. Keep the user interface simple: fewer clicks, fewer fields, fewer decisions.
13. Platform administration is separate from clinic administration.
14. A user with memberships in multiple clinics must explicitly select the clinic before a clinic-bound MFA challenge or session is created.
15. Tenant context is resolved before clinic data access; direct URL/API access must use the same authorization path as UI navigation.
16. Subscription entitlements are enforced server-side. Hiding a feature in the UI is never an entitlement or security control.
17. Maintenance mode is enforced server-side and can be activated centrally for the whole platform.
18. Datastore migration/provisioning is versioned and health-checked before a clinic is activated on a new isolation mode.
19. Clinic data stores must be encrypted in transit and at rest through the infrastructure provider, with keys and credentials managed outside application records.
20. The architecture follows a pool/bridge/silo model so stronger isolation can be introduced per clinic without redesigning clinic business modules.

## Control plane and data plane

### Control plane

The control plane owns platform-level metadata:

- platform users and roles
- clinics and tenant identifiers
- tenant isolation mode
- datastore provisioning state
- secret-manager references
- quotes and subscriptions
- maintenance windows
- operational health and migration version metadata

The control plane must not contain patient names, clinical notes, prescriptions, invoices, or other clinic business records.

### Clinic data plane

The clinic data plane owns:

- patients and consents
- visits and prescriptions
- pharmacy and inventory
- invoices, payments, expenses
- clinic audit records

The application must resolve the tenant context first and then use the tenant-aware data access layer. A request must never select a clinic solely from a user-supplied identifier without verifying the authenticated user's membership or platform-level authority.

## Tenant isolation lifecycle

1. Clinic is created in the control plane.
2. A quote is prepared and accepted manually; there is no payment-provider dependency in the MVP.
3. The clinic receives an isolation mode based on the platform policy and customer requirements.
4. For `POOL`, the clinic is activated in the shared database.
5. For `BRIDGE_DATABASE` or `SILO_DATABASE`, infrastructure provisions the datastore and secret reference, runs the approved migrations, performs health checks, and registers the resulting datastore.
6. Only a healthy, supported datastore can become active.
7. Data migration between isolation modes is a controlled operational workflow with backups, validation, audit evidence, and rollback planning.

## Multi-clinic authentication

Authentication order is deliberately strict:

1. Validate email/password and login-security controls.
2. Resolve the user's eligible clinic memberships without exposing them before password verification.
3. If exactly one clinic is eligible, select it automatically.
4. If multiple clinics are eligible, return a clinic-selection-required result containing only safe clinic metadata needed for selection.
5. Validate the selected clinic against the authenticated user's membership.
6. Bind any MFA challenge to the selected clinic.
7. After MFA succeeds, create a session bound to the selected clinic.

The session is never created for a clinic that was not explicitly selected or safely auto-selected from a single membership.

## Subscription and access lifecycle

Clinic access is controlled by server-side subscription state. Supported lifecycle states include:

- `SETUP`
- `TRIAL`
- `ACTIVE`
- `GRACE_PERIOD`
- `PAST_DUE`
- `SUSPENDED`
- `CANCELLED`
- `EXPIRED`

Only `ACTIVE`, or `GRACE_PERIOD` while its grace period is still valid, grants normal clinic access. The application must not treat a UI banner or client-side state as an entitlement control.

Quotes are manual and custom-priced. A future payment provider can integrate later through verified, idempotent webhooks without changing clinic subscription semantics.

## Platform-wide maintenance

Maintenance is centrally controlled and server-enforced. A maintenance window records status, start/end time, expected end, maintenance type, user-facing message, and last update information. Emergency security maintenance may be activated outside routine maintenance windows.

## Cross-module flows

### Patient care and billing

Patient -> Visit -> Treatment/Prescription -> Invoice -> Payment -> Visit completion

### Pharmacy

Prescription -> Pharmacy review -> Stock check -> Dispensing -> Stock movement -> Charge/Invoice

### Payments

Invoice -> Payment initiation -> Provider verification -> Verified payment -> Receipt -> Reporting

### Inventory

Purchase -> Stock batch -> Available stock -> Dispensing/adjustment -> Updated balance -> Low-stock/expiry attention

## Data protection

Patient and clinical information is sensitive. Access must follow least privilege. Avoid exposing clinical information to roles that do not need it. Audit access and changes to sensitive records. The system must maintain a formal data inventory, DPIA/risk assessment, retention schedule, breach-response procedure, processor register, and evidence of security testing before production approval.

## Security and compliance baseline

Engineering controls are mapped to applicable legal and contractual requirements rather than treating a framework as a legal certification. Kenya data-protection obligations are the primary baseline for Kenyan operations; HIPAA controls apply when the product or a customer is actually within HIPAA scope; NIST CSF 2.0 is used as the cybersecurity risk-management framework.
